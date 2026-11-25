'use strict';

const crypto = require('crypto');
const { In } = require('typeorm');
const { AppDataSource } = require('../database/data-source');
const RunSchema = require('../entities/TeamChecklistRun');
const ItemSchema = require('../entities/TeamChecklistRunItem');
const TeamSchema = require('../entities/Team');
const ChecklistSchema = require('../entities/TeamChecklist');
const TeamMentorSchema = require('../entities/TeamMentor');
const UserSchema = require('../entities/User');
const SeasonDateSchema = require('../entities/SeasonDate');
const AuditMailSchema = require('../entities/AuditMail');
const { readChecklist } = require('./teamChecklistService');
const { enqueueEmail, enqueueEmailOnce, recordSkippedEmail, normalizeEmail } = require('./emailQueueService');
const { isUnsubscribed } = require('./notificationPreferenceService');
const { reveal } = require('./sensitiveDataService');
const { buildChecklistMentorEmail } = require('./emailService');
const { encrypt } = require('./sensitiveDataService');

const EMAIL_CATEGORY = 'team_checklist';
const RUN_INTERVAL_MS = Number(process.env.CHECKLIST_RUN_INTERVAL_MS) || 15_000;
const RETRY_DELAY_MS = Number(process.env.CHECKLIST_RUN_RETRY_DELAY_MS) || 30_000;
const runRepo = () => AppDataSource.getRepository(RunSchema);
const itemRepo = () => AppDataSource.getRepository(ItemSchema);
let timer = null;
let processing = false;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
}

function diffItems(previousItems, nextItems) {
  const before = new Map((previousItems || []).map((item) => [item.code, item]));
  return (nextItems || []).filter((item) => before.has(item.code) && before.get(item.code).status !== item.status).map((item) => ({
    code: item.code,
    label: item.label,
    from: before.get(item.code).status,
    to: item.status,
  }));
}

async function startRun({ seasonID, mode = 'manual', seasonDateID = null, targetDate = null }) {
  const id = Number(seasonID);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Temporada inválida.');
  const auto = mode === 'automatic';
  const runKey = auto ? `auto:${id}:${seasonDateID}` : `manual:${id}:${crypto.randomUUID()}`;
  const activeKey = `season:${id}`;
  const existing = auto ? await runRepo().findOne({ where: { runKey } }) : null;
  if (existing) return existing;
  const active = await runRepo().findOne({ where: { activeKey } });
  if (active) {
    if (auto && !active.sendMentorEmails) {
      active.mode = 'automatic';
      active.sendMentorEmails = true;
      active.seasonDateID = seasonDateID;
      active.targetDate = targetDate;
      await runRepo().save(active);
    }
    return active;
  }
  const teams = await AppDataSource.getRepository(TeamSchema).find({ where: { seasonID: id }, order: { nombre: 'ASC' } });
  const records = teams.length ? await AppDataSource.getRepository(ChecklistSchema).find({ where: { teamID: In(teams.map((team) => team.ID)) } }) : [];
  const linkedIDs = new Set(records.filter((record) => record.fileUrl).map((record) => record.teamID));
  const selectedTeams = teams.filter((team) => linkedIDs.has(team.ID));
  const run = runRepo().create({
    runKey, activeKey, seasonID: id, seasonDateID, targetDate, mode,
    sendMentorEmails: auto, status: selectedTeams.length ? 'queued' : 'completed', total: selectedTeams.length,
    completed: 0, failed: 0, finishedAt: selectedTeams.length ? null : new Date(),
  });
  try {
    const saved = await runRepo().save(run);
    if (selectedTeams.length) await itemRepo().save(selectedTeams.map((team) => itemRepo().create({ runID: saved.ID, teamID: team.ID, teamName: team.nombre })));
    else await runRepo().update(saved.ID, { activeKey: null });
    return saved;
  } catch (error) {
    if (auto) {
      const duplicate = await runRepo().findOne({ where: { runKey } });
      if (duplicate) return duplicate;
    }
    const current = await runRepo().findOne({ where: { activeKey } });
    if (current) return current;
    throw error;
  }
}

async function processOne(item) {
  const team = await AppDataSource.getRepository(TeamSchema).findOne({ where: { ID: item.teamID } });
  const checklistRepo = AppDataSource.getRepository(ChecklistSchema);
  const record = await checklistRepo.findOne({ where: { teamID: item.teamID } });
  if (!team || !record?.fileUrl) throw new Error('Equipo o enlace de checklist ya no disponible.');
  const before = record.items;
  let summary;
  try {
    summary = await readChecklist(record.fileUrl);
    record.valuesEncrypted = encrypt(JSON.stringify(summary.values || {}));
  } catch (error) {
    record.status = 'error';
    record.lastAttemptAt = new Date();
    record.lastError = String(error?.message || 'Error al leer la planilla.').slice(0, 500);
    await checklistRepo.save(record);
    throw error;
  }
  const now = new Date();
  record.status = 'reviewed';
  record.items = summary.items;
  record.completedCount = summary.completedCount;
  record.applicableCount = summary.applicableCount;
  record.percent = summary.percent;
  record.lastAttemptAt = now;
  record.lastSuccessfulReviewAt = now;
  record.lastError = null;
  await checklistRepo.save(record);
  await itemRepo().update(item.ID, { status: 'completed', completedAt: now, lastError: null, changes: diffItems(before, summary.items) });
}

async function queueMentorEmails(run) {
  const finishedItems = await itemRepo().find({ where: { runID: run.ID }, order: { ID: 'ASC' } });
  const appUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const checklistUrl = `${appUrl}/mi-checklist`;
  for (const item of finishedItems) {
    const assignments = await AppDataSource.getRepository(TeamMentorSchema).find({ where: { teamID: item.teamID } });
    const mentorIDs = [...new Set(assignments.map((assignment) => assignment.mentorID))];
    if (!mentorIDs.length) continue;
    const mentors = await AppDataSource.getRepository(UserSchema).find({ where: { ID: In(mentorIDs), rol: 'voluntario' } });
    const teamRecord = await AppDataSource.getRepository(ChecklistSchema).findOne({ where: { teamID: item.teamID } });
    for (const mentor of mentors) {
      let email;
      try { email = normalizeEmail(reveal(mentor, 'email')); } catch { continue; }
      if (!email) continue;
      const displayName = [mentor.nombre, mentor.apellido].filter(Boolean).join(' ');
      const hasCurrentReview = item.status === 'completed';
      const message = hasCurrentReview
        ? buildChecklistMentorEmail(displayName, item.teamName, teamRecord?.percent, teamRecord?.completedCount, teamRecord?.applicableCount, item.changes, checklistUrl, teamRecord?.items || [])
        : {
          subject: `No se pudo actualizar el checklist · ${item.teamName}`,
          htmlBody: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#1a365d"><h2>Technovation Girls Chile</h2><p>Hola ${escapeHtml(displayName)},</p><p>No se pudo revisar el checklist de <strong>${escapeHtml(item.teamName)}</strong> tras ${item.attempts} intentos. La revisión quedó registrada para administración. El sistema no muestra datos anteriores como si fueran actuales.</p><p><a href="${escapeHtml(checklistUrl)}">Abrir “Mi checklist”</a></p></div>`,
        };
      const idempotencyKey = `checklist-run:${run.ID}:team:${item.teamID}:mentor:${mentor.ID}`;
      const emailOptions = {
        recipientEmail: email, ...message, category: EMAIL_CATEGORY,
        relatedEntityType: 'TeamChecklistRunItem', relatedEntityID: item.ID,
        idempotencyKey,
      };
      if (await isUnsubscribed(email, EMAIL_CATEGORY)) {
        const existing = await AppDataSource.getRepository(AuditMailSchema).findOne({ where: { idempotencyKey } });
        if (!existing) await recordSkippedEmail(emailOptions);
      } else {
        await enqueueEmailOnce(emailOptions);
      }
    }
  }
}

async function sendTeamChecklistStatus(teamID) {
  const id = Number(teamID);
  const team = await AppDataSource.getRepository(TeamSchema).findOne({ where: { ID: id } });
  if (!team) throw new Error('Equipo no encontrado.');
  const checklist = await AppDataSource.getRepository(ChecklistSchema).findOne({ where: { teamID: id } });
  if (!checklist?.fileUrl || checklist.status !== 'reviewed' || !checklist.lastSuccessfulReviewAt) {
    throw new Error('Primero actualiza el checklist para enviar su estado actual.');
  }
  const assignments = await AppDataSource.getRepository(TeamMentorSchema).find({ where: { teamID: id } });
  const mentorIDs = [...new Set(assignments.map((assignment) => assignment.mentorID))];
  if (!mentorIDs.length) return { queued: 0, skipped: 0, failed: 0, message: 'El equipo no tiene mentores asignados.' };
  const mentors = await AppDataSource.getRepository(UserSchema).find({ where: { ID: In(mentorIDs), rol: 'voluntario' } });
  const appUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const checklistUrl = `${appUrl}/mi-checklist`;
  let queued = 0;
  let skipped = 0;
  let failed = 0;
  for (const mentor of mentors) {
    let email;
    try { email = normalizeEmail(reveal(mentor, 'email')); } catch { failed += 1; continue; }
    if (!email) { skipped += 1; continue; }
    const displayName = [mentor.nombre, mentor.apellido].filter(Boolean).join(' ');
    const message = buildChecklistMentorEmail(displayName, team.nombre, checklist.percent, checklist.completedCount, checklist.applicableCount, null, checklistUrl, checklist.items || []);
    const emailOptions = { recipientEmail: email, ...message, category: EMAIL_CATEGORY, relatedEntityType: 'TeamChecklist', relatedEntityID: id };
    try {
      if (await isUnsubscribed(email, EMAIL_CATEGORY)) {
        await recordSkippedEmail(emailOptions);
        skipped += 1;
      } else {
        await enqueueEmail(emailOptions);
        queued += 1;
      }
    } catch {
      failed += 1;
    }
  }
  return { queued, skipped, failed, message: null };
}

async function finalizeIfDrained(runID) {
  const run = await runRepo().findOne({ where: { ID: runID } });
  if (!run) return;
  if (['completed', 'completed_with_errors'].includes(run.status) && (!run.sendMentorEmails || run.notificationsQueued)) return;
  const items = await itemRepo().find({ where: { runID } });
  if (items.some((item) => ['queued', 'processing'].includes(item.status))) return;
  const completed = items.filter((item) => item.status === 'completed').length;
  const failed = items.filter((item) => item.status === 'failed').length;
  run.completed = completed;
  run.failed = failed;
  run.currentTeamName = null;
  if (run.sendMentorEmails && !run.notificationsQueued) {
    try {
      await queueMentorEmails(run);
      run.notificationsQueued = true;
    } catch (error) {
      console.error(`[Checklist runs] Error encolando avisos de ejecución ${run.ID}:`, error.message);
      await runRepo().save(run);
      return;
    }
  }
  run.status = failed ? 'completed_with_errors' : 'completed';
  run.finishedAt = new Date();
  await runRepo().save(run);
  await runRepo().update(run.ID, { activeKey: null });
}

async function processChecklistRuns() {
  if (processing || !AppDataSource.isInitialized) return;
  processing = true;
  try {
    const runs = await runRepo().find({ where: { status: In(['queued', 'running']) }, order: { createdAt: 'ASC' }, take: 10 });
    for (const run of runs) {
      let item = await itemRepo().findOne({ where: { runID: run.ID, status: 'queued' }, order: { ID: 'ASC' } });
      if (!item) { await finalizeIfDrained(run.ID); continue; }
      const now = new Date();
      if (!run.startedAt) run.startedAt = now;
      run.status = 'running';
      run.currentTeamName = item.teamName;
      await runRepo().save(run);
      const claimed = await itemRepo().createQueryBuilder().update().set({ status: 'processing', attempts: () => 'attempts + 1' }).where('ID = :id', { id: item.ID }).andWhere('status = :status', { status: 'queued' }).execute();
      if (claimed.affected !== 1) continue;
      item.status = 'processing';
      item.attempts += 1;
      try {
        await processOne(item);
      } catch (error) {
        const lastError = String(error?.message || 'Error al revisar checklist.').slice(0, 500);
        if (item.attempts < item.maxAttempts) {
          await itemRepo().update(item.ID, { status: 'queued', lastError });
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        } else {
          await itemRepo().update(item.ID, { status: 'failed', lastError, completedAt: new Date() });
        }
      }
      const counts = await itemRepo().createQueryBuilder('item').select('item.status', 'status').addSelect('COUNT(*)', 'count').where('item.runID = :runID', { runID: run.ID }).groupBy('item.status').getRawMany();
      const countMap = Object.fromEntries(counts.map((row) => [row.status, Number(row.count)]));
      await runRepo().update(run.ID, { completed: countMap.completed || 0, failed: countMap.failed || 0 });
      await finalizeIfDrained(run.ID);
    }
  } finally {
    processing = false;
  }
}

function localDateAndTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${values.year}-${values.month}-${values.day}`, hour: Number(values.hour), minute: Number(values.minute) };
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoDate(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);
}

async function scheduleDueRuns(now = new Date()) {
  const { date, hour } = localDateAndTime(now);
  if (hour < 19) return;
  const tomorrow = addDays(date, 1);
  const dates = await AppDataSource.getRepository(SeasonDateSchema).find({ order: { fecha: 'ASC' } });
  const nextBySeason = new Map();
  for (const seasonDate of dates) {
    const dateValue = isoDate(seasonDate.fecha);
    if (dateValue < date) continue;
    const existing = nextBySeason.get(seasonDate.seasonID);
    if (!existing || dateValue < isoDate(existing.fecha)) nextBySeason.set(seasonDate.seasonID, seasonDate);
  }
  for (const [seasonID, seasonDate] of nextBySeason) {
    if (isoDate(seasonDate.fecha) === tomorrow) {
      await startRun({ seasonID, mode: 'automatic', seasonDateID: seasonDate.ID, targetDate: tomorrow });
    }
  }
}

async function workerTick() {
  if (!AppDataSource.isInitialized) return;
  try {
    await scheduleDueRuns();
    await processChecklistRuns();
  } catch (error) {
    console.error('[Checklist runs] Worker error:', error.message);
  }
}

async function getRun(runID) {
  const run = await runRepo().findOne({ where: { ID: Number(runID) } });
  if (!run) return null;
  const items = await itemRepo().find({ where: { runID: run.ID }, order: { ID: 'ASC' } });
  return { ...run, items };
}

async function getActiveRun(seasonID) {
  const run = await runRepo().findOne({ where: { activeKey: `season:${Number(seasonID)}` } });
  return run ? getRun(run.ID) : null;
}

async function getOverview(seasonID, now = new Date()) {
  const id = Number(seasonID);
  const activeRun = await getActiveRun(id);
  const lastRun = await runRepo().findOne({
    where: { seasonID: id, status: In(['completed', 'completed_with_errors']) },
    order: { finishedAt: 'DESC' },
  });
  const today = localDateAndTime(now).date;
  const upcoming = await AppDataSource.getRepository(SeasonDateSchema).find({ where: { seasonID: id }, order: { fecha: 'ASC' } });
  const scheduledCandidates = upcoming.map((seasonDate) => {
    const targetDate = isoDate(seasonDate.fecha);
    return { targetDate, scheduledDate: addDays(targetDate, -1) };
  }).filter(({ scheduledDate }) => {
    if (scheduledDate > today) return true;
    if (scheduledDate < today) return false;
    return localDateAndTime(now).hour < 19;
  }).sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  const nextReview = scheduledCandidates[0] || null;
  return {
    activeRun,
    lastRun: lastRun ? {
      ID: lastRun.ID,
      mode: lastRun.mode,
      status: lastRun.status,
      total: lastRun.total,
      completed: lastRun.completed,
      failed: lastRun.failed,
      finishedAt: lastRun.finishedAt,
    } : null,
    nextReview,
  };
}

function startChecklistRunWorker() {
  if (timer) return timer;
  void workerTick();
  timer = setInterval(() => void workerTick(), RUN_INTERVAL_MS);
  console.log(`[Checklist runs] Worker iniciado (cada ${RUN_INTERVAL_MS} ms)`);
  return timer;
}

function stopChecklistRunWorker() {
  if (timer) clearInterval(timer);
  timer = null;
}

module.exports = { startRun, getRun, getActiveRun, getOverview, sendTeamChecklistStatus, startChecklistRunWorker, stopChecklistRunWorker, scheduleDueRuns, processChecklistRuns };

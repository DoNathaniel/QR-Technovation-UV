'use strict';

const { In } = require('typeorm');
const { AppDataSource } = require('../database/data-source');
const TeamSchema = require('../entities/Team');
const TeamMentorSchema = require('../entities/TeamMentor');
const TeamChecklistSchema = require('../entities/TeamChecklist');
const SeasonDateSchema = require('../entities/SeasonDate');
const { readChecklist, extractDriveFileId, MAX_CHECKLIST_SECTION } = require('../services/teamChecklistService');
const checklistRuns = require('../services/teamChecklistRunService');

const teamRepository = () => AppDataSource.getRepository(TeamSchema);
const mentorRepository = () => AppDataSource.getRepository(TeamMentorSchema);
const checklistRepository = () => AppDataSource.getRepository(TeamChecklistSchema);
const isAdmin = (req) => ['admin', 'superadmin'].includes(req.user?.rol);

function summaryForRecord(record, { sessionNumber = 0, currentPoint = null } = {}) {
  const items = record?.items || [];
  const sectionMap = new Map();
  for (const item of items) {
    if (!sectionMap.has(item.section)) sectionMap.set(item.section, { code: item.section, label: item.sectionLabel, items: [] });
    sectionMap.get(item.section).items.push(item);
  }
  const sections = [...sectionMap.values()].map((section) => {
    const applicable = section.items.filter((item) => !['optional', 'not_applicable'].includes(item.status));
    const completedCount = applicable.filter((item) => item.status === 'complete').length;
    return {
      ...section,
      completedCount,
      applicableCount: applicable.length,
      percent: applicable.length ? Math.round((completedCount / applicable.length) * 100) : null,
    };
  });
  const dateItems = currentPoint === null ? [] : items.filter((item) => Number(item.section) <= currentPoint);
  const dateApplicableItems = dateItems.filter((item) => !['optional', 'not_applicable'].includes(item.status));
  const dateCompletedCount = dateApplicableItems.filter((item) => item.status === 'complete').length;
  return {
    status: record?.status || 'unlinked',
    fileUrl: record?.fileUrl || null,
    items,
    sections,
    completedCount: record?.completedCount || 0,
    applicableCount: record?.applicableCount || 0,
    percent: record?.percent || 0,
    lastAttemptAt: record?.lastAttemptAt || null,
    lastSuccessfulReviewAt: record?.lastSuccessfulReviewAt || null,
    lastError: record?.lastError || null,
    hasLastSuccessfulResult: Boolean(record?.lastSuccessfulReviewAt),
    progressToDate: {
      sessionNumber,
      currentPoint,
      completedCount: dateCompletedCount,
      applicableCount: dateApplicableItems.length,
      percent: dateApplicableItems.length ? Math.round((dateCompletedCount / dateApplicableItems.length) * 100) : null,
    },
  };
}

function localDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKey(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);
}

async function list(req, res) {
  const seasonID = Number(req.query.seasonID);
  if (!Number.isInteger(seasonID) || seasonID <= 0) return res.status(400).json({ message: 'seasonID es requerido.' });
  try {
    let teams;
    if (isAdmin(req)) {
      teams = await teamRepository().find({ where: { seasonID }, order: { nombre: 'ASC' } });
    } else {
      const mentorID = Number(req.user?.id ?? req.user?.ID);
      if (!Number.isInteger(mentorID) || mentorID <= 0) return res.status(403).json({ message: 'No se pudo identificar la cuenta de mentor.' });
      // The team is the source of season membership. The duplicated seasonID on
      // TeamMentor can be stale on older assignments, so scope by team season below.
      const assignments = await mentorRepository().find({ where: { mentorID } });
      const teamIDs = [...new Set(assignments.map((assignment) => assignment.teamID))];
      teams = teamIDs.length ? await teamRepository().find({ where: { ID: In(teamIDs), seasonID }, order: { nombre: 'ASC' } }) : [];
    }
    if (!teams.length) return res.json([]);
    const seasonDates = await AppDataSource.getRepository(SeasonDateSchema).find({ where: { seasonID }, order: { fecha: 'ASC' } });
    const today = localDateKey();
    const passedDates = seasonDates.filter((date) => dateKey(date.fecha) <= today);
    const sessionNumber = passedDates.length;
    const latestSession = passedDates.at(-1);
    const currentPoint = latestSession
      ? latestSession.checklistPoint === null || latestSession.checklistPoint === undefined
        ? Math.min(sessionNumber - 1, MAX_CHECKLIST_SECTION)
        : latestSession.checklistPoint
      : null;
    const records = await checklistRepository().find({ where: { teamID: In(teams.map((team) => team.ID)) } });
    const recordMap = new Map(records.map((record) => [record.teamID, record]));
    return res.json(teams.map((team) => ({ team, checklist: summaryForRecord(recordMap.get(team.ID), { sessionNumber, currentPoint }) })));
  } catch {
    return res.status(500).json({ message: 'No se pudieron cargar los checklists.' });
  }
}

async function setLink(req, res) {
  const teamID = Number(req.params.teamID);
  const fileUrl = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!Number.isInteger(teamID) || teamID <= 0) return res.status(400).json({ message: 'Equipo inválido.' });
  if (fileUrl.length > 1000) return res.status(400).json({ message: 'El enlace supera el largo permitido.' });
  let fileId;
  try { fileId = extractDriveFileId(fileUrl); } catch (error) { return res.status(400).json({ message: error.message }); }
  try {
    const team = await teamRepository().findOne({ where: { ID: teamID } });
    if (!team) return res.status(404).json({ message: 'Equipo no encontrado.' });
    let record = await checklistRepository().findOne({ where: { teamID } });
    const sameFile = record?.fileUrl && extractDriveFileId(record.fileUrl) === fileId;
    if (!record) record = checklistRepository().create({ teamID });
    record.fileUrl = fileUrl;
    if (!sameFile) {
      record.status = 'not_reviewed';
      record.items = null;
      record.completedCount = 0;
      record.applicableCount = 0;
      record.percent = 0;
      record.lastAttemptAt = null;
      record.lastSuccessfulReviewAt = null;
      record.lastError = null;
    }
    await checklistRepository().save(record);
    return res.json({ team, checklist: summaryForRecord(record) });
  } catch {
    return res.status(500).json({ message: 'No se pudo vincular el checklist.' });
  }
}

async function unlink(req, res) {
  const teamID = Number(req.params.teamID);
  if (!Number.isInteger(teamID) || teamID <= 0) return res.status(400).json({ message: 'Equipo inválido.' });
  try {
    await checklistRepository().delete({ teamID });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ message: 'No se pudo desvincular el checklist.' });
  }
}

async function refresh(req, res) {
  const teamID = Number(req.params.teamID);
  if (!Number.isInteger(teamID) || teamID <= 0) return res.status(400).json({ message: 'Equipo inválido.' });
  const repository = checklistRepository();
  let record;
  try {
    record = await repository.findOne({ where: { teamID } });
    if (!record?.fileUrl) return res.status(409).json({ message: 'Este equipo no tiene un checklist vinculado.' });
    const summary = await readChecklist(record.fileUrl);
    const now = new Date();
    record.status = 'reviewed';
    record.items = summary.items;
    record.completedCount = summary.completedCount;
    record.applicableCount = summary.applicableCount;
    record.percent = summary.percent;
    record.lastAttemptAt = now;
    record.lastSuccessfulReviewAt = now;
    record.lastError = null;
    await repository.save(record);
    return res.json(summaryForRecord(record));
  } catch (error) {
    if (record) {
      record.status = 'error';
      record.lastAttemptAt = new Date();
      record.lastError = error instanceof Error ? error.message.slice(0, 500) : 'Error al leer la planilla.';
      await repository.save(record).catch(() => {});
    }
    return res.status(502).json({ message: record?.lastError || 'No se pudo actualizar el checklist.' });
  }
}

async function verifyAll(req, res) {
  const seasonID = Number(req.body?.seasonID);
  if (!Number.isInteger(seasonID) || seasonID <= 0) return res.status(400).json({ message: 'seasonID es requerido.' });
  try {
    const run = await checklistRuns.startRun({ seasonID, mode: 'manual' });
    return res.status(202).json(await checklistRuns.getRun(run.ID));
  } catch (error) {
    return res.status(500).json({ message: error.message || 'No se pudo iniciar la revisión masiva.' });
  }
}

async function getRun(req, res) {
  const run = await checklistRuns.getRun(req.params.runID);
  if (!run) return res.status(404).json({ message: 'Ejecución de checklist no encontrada.' });
  return res.json(run);
}

async function getActiveRun(req, res) {
  const seasonID = Number(req.query.seasonID);
  if (!Number.isInteger(seasonID) || seasonID <= 0) return res.status(400).json({ message: 'seasonID es requerido.' });
  return res.json(await checklistRuns.getActiveRun(seasonID));
}

async function getRunOverview(req, res) {
  const seasonID = Number(req.query.seasonID);
  if (!Number.isInteger(seasonID) || seasonID <= 0) return res.status(400).json({ message: 'seasonID es requerido.' });
  return res.json(await checklistRuns.getOverview(seasonID));
}

async function sendStatusToMentors(req, res) {
  const teamID = Number(req.params.teamID);
  if (!Number.isInteger(teamID) || teamID <= 0) return res.status(400).json({ message: 'Equipo inválido.' });
  try {
    return res.json(await checklistRuns.sendTeamChecklistStatus(teamID));
  } catch (error) {
    const message = error.message || 'No se pudo enviar el estado del checklist.';
    const status = message === 'Equipo no encontrado.' ? 404 : message.startsWith('Primero actualiza') ? 409 : 500;
    return res.status(status).json({ message });
  }
}

module.exports = { list, setLink, unlink, refresh, verifyAll, getRun, getActiveRun, getRunOverview, sendStatusToMentors };

'use strict';

const { AppDataSource } = require('../database/data-source');
const AuditMailSchema = require('../entities/AuditMail');
const { deliverEmail } = require('./emailService');

const DEFAULT_INTERVAL_MS = 10_000;
const DEFAULT_BATCH_SIZE = 10;
const STALE_PROCESSING_MS = 10 * 60 * 1000;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000];

let workerTimer = null;
let isProcessing = false;

const repository = () => AppDataSource.getRepository(AuditMailSchema);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function uniqueEmails(...emails) {
  return [...new Set(emails.map(normalizeEmail).filter(Boolean))];
}

function retryDelay(attempt) {
  return RETRY_DELAYS_MS[Math.min(Math.max(attempt - 1, 0), RETRY_DELAYS_MS.length - 1)];
}

function serializeError(error) {
  return String(error?.message || error || 'Error desconocido').slice(0, 65_000);
}

async function enqueueEmail({ recipientEmail, subject, htmlBody, category = 'system', relatedEntityType = null, relatedEntityID = null, studentID = null, maxAttempts = 3 }) {
  const normalizedRecipient = normalizeEmail(recipientEmail);
  if (!normalizedRecipient) throw new Error('No se puede encolar un correo sin destinatario');
  if (!subject || !htmlBody) throw new Error('El correo requiere asunto y contenido HTML');

  const job = repository().create({
    recipientEmail: normalizedRecipient,
    subject,
    htmlBody,
    category,
    relatedEntityType,
    relatedEntityID,
    studentID,
    maxAttempts: Math.max(1, Number(maxAttempts) || 3),
    status: 'pending',
    nextAttemptAt: new Date(),
  });
  return repository().save(job);
}

async function recordSkippedEmail({ recipientEmail, subject, htmlBody, category = 'system', relatedEntityType = null, relatedEntityID = null, studentID = null }) {
  const normalizedRecipient = normalizeEmail(recipientEmail);
  if (!normalizedRecipient) throw new Error('No se puede auditar un correo omitido sin destinatario');
  const job = repository().create({
    recipientEmail: normalizedRecipient,
    subject,
    htmlBody,
    category,
    relatedEntityType,
    relatedEntityID,
    studentID,
    status: 'skipped_unsubscribed',
    nextAttemptAt: null,
    lastError: 'Destinatario desuscrito de esta categoría de notificaciones.',
  });
  return repository().save(job);
}

async function recoverStaleJobs(now = new Date()) {
  const staleAt = new Date(now.getTime() - STALE_PROCESSING_MS);
  await repository()
    .createQueryBuilder()
    .update()
    .set({ status: 'pending', lockedAt: null, nextAttemptAt: now })
    .where('status = :status', { status: 'processing' })
    .andWhere('lockedAt <= :staleAt', { staleAt })
    .execute();
}

async function claimNextJob(now = new Date()) {
  const candidate = await repository()
    .createQueryBuilder('mail')
    .where('mail.status = :status', { status: 'pending' })
    .andWhere('(mail.nextAttemptAt IS NULL OR mail.nextAttemptAt <= :now)', { now })
    .orderBy('mail.createdAt', 'ASC')
    .getOne();
  if (!candidate) return null;

  const claim = await repository()
    .createQueryBuilder()
    .update()
    .set({ status: 'processing', lockedAt: now, attempts: () => 'attempts + 1', lastError: null })
    .where('ID = :id', { id: candidate.ID })
    .andWhere('status = :status', { status: 'pending' })
    .execute();
  if (claim.affected !== 1) return null;
  return repository().findOneBy({ ID: candidate.ID });
}

async function markJobSent(job, providerResponse) {
  const providerMessageID = providerResponse?.message_id || providerResponse?.data?.message_id || null;
  await repository().update(job.ID, {
    status: 'sent', sentAt: new Date(), lockedAt: null, nextAttemptAt: null, lastError: null, providerMessageID,
  });
}

async function markJobFailed(job, error) {
  const failure = { lockedAt: null, lastError: serializeError(error) };
  if (job.attempts >= job.maxAttempts) {
    await repository().update(job.ID, { ...failure, status: 'failed', nextAttemptAt: null });
    return;
  }
  await repository().update(job.ID, {
    ...failure,
    status: 'pending',
    nextAttemptAt: new Date(Date.now() + retryDelay(job.attempts)),
  });
}

async function processEmailQueue({ batchSize = DEFAULT_BATCH_SIZE } = {}) {
  if (isProcessing || !AppDataSource.isInitialized) return { processed: 0, skipped: true };
  isProcessing = true;
  let processed = 0;
  try {
    await recoverStaleJobs();
    while (processed < batchSize) {
      const job = await claimNextJob();
      if (!job) break;
      try {
        const response = await deliverEmail({
          to: job.recipientEmail,
          subject: job.subject,
          htmlBody: job.htmlBody,
        });
        await markJobSent(job, response);
      } catch (error) {
        console.error(`[Email queue] Error enviando correo ${job.ID}:`, error.message);
        await markJobFailed(job, error);
      }
      processed += 1;
    }
    return { processed, skipped: false };
  } finally {
    isProcessing = false;
  }
}

function startEmailQueueWorker({ intervalMs = Number(process.env.EMAIL_QUEUE_INTERVAL_MS) || DEFAULT_INTERVAL_MS, batchSize = Number(process.env.EMAIL_QUEUE_BATCH_SIZE) || DEFAULT_BATCH_SIZE } = {}) {
  if (workerTimer) return workerTimer;
  const run = () => processEmailQueue({ batchSize }).catch((error) => console.error('[Email queue] Worker error:', error.message));
  run();
  workerTimer = setInterval(run, intervalMs);
  console.log(`[Email queue] Worker iniciado (cada ${intervalMs} ms, lote ${batchSize})`);
  return workerTimer;
}

function stopEmailQueueWorker() {
  if (workerTimer) clearInterval(workerTimer);
  workerTimer = null;
}

module.exports = {
  enqueueEmail, recordSkippedEmail, processEmailQueue, startEmailQueueWorker, stopEmailQueueWorker,
  normalizeEmail, uniqueEmails, retryDelay, recoverStaleJobs,
};

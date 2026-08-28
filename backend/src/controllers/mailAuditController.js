'use strict';

const { AppDataSource } = require('../database/data-source');
const AuditMailSchema = require('../entities/AuditMail');

const AUDIT_STATUSES = ['pending', 'processing', 'sent', 'failed', 'skipped_unsubscribed'];
const MAX_PAGE_SIZE = 100;

const repository = () => AppDataSource.getRepository(AuditMailSchema);

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function nextDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

function parseAuditQuery(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(query.pageSize, 10) || 25));
  const status = String(query.status || '').trim();
  const category = String(query.category || '').trim();
  const recipient = String(query.recipient || '').trim().toLowerCase();
  const dateFrom = String(query.dateFrom || '').trim();
  const dateTo = String(query.dateTo || '').trim();

  if (status && !AUDIT_STATUSES.includes(status)) throw new Error('El estado de auditoría no es válido');
  if (dateFrom && !validDate(dateFrom)) throw new Error('La fecha inicial no es válida');
  if (dateTo && !validDate(dateTo)) throw new Error('La fecha final no es válida');
  if (dateFrom && dateTo && dateFrom > dateTo) throw new Error('La fecha inicial no puede ser posterior a la final');

  return {
    page,
    pageSize,
    status: status || null,
    category: category.slice(0, 100) || null,
    recipient: recipient.slice(0, 255) || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
  };
}

function serializeAudit(mail, { detail = false } = {}) {
  return {
    ID: mail.ID,
    recipientEmail: mail.recipientEmail,
    subject: mail.subject,
    category: mail.category,
    status: mail.status,
    relatedEntityType: mail.relatedEntityType,
    relatedEntityID: mail.relatedEntityID,
    studentID: mail.studentID,
    attempts: mail.attempts,
    maxAttempts: mail.maxAttempts,
    nextAttemptAt: mail.nextAttemptAt,
    lockedAt: mail.lockedAt,
    sentAt: mail.sentAt,
    providerMessageID: mail.providerMessageID,
    lastError: mail.lastError,
    createdAt: mail.createdAt,
    updatedAt: mail.updatedAt,
    ...(detail ? { hasHtmlBody: Boolean(mail.htmlBody) } : {}),
  };
}

function auditQuery(filters) {
  const query = repository().createQueryBuilder('mail');
  if (filters.status) query.andWhere('mail.status = :status', { status: filters.status });
  if (filters.category) query.andWhere('mail.category = :category', { category: filters.category });
  if (filters.recipient) query.andWhere('LOWER(mail.recipientEmail) LIKE :recipient', { recipient: `%${filters.recipient}%` });
  if (filters.dateFrom) query.andWhere('mail.createdAt >= :dateFrom', { dateFrom: `${filters.dateFrom} 00:00:00` });
  if (filters.dateTo) query.andWhere('mail.createdAt < :dateTo', { dateTo: `${nextDate(filters.dateTo)} 00:00:00` });
  return query;
}

async function list(req, res) {
  try {
    const filters = parseAuditQuery(req.query);
    const [rows, total] = await auditQuery(filters)
      .orderBy('mail.createdAt', 'DESC')
      .addOrderBy('mail.ID', 'DESC')
      .skip((filters.page - 1) * filters.pageSize)
      .take(filters.pageSize)
      .getManyAndCount();
    res.json({
      data: rows.map((mail) => serializeAudit(mail)),
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      },
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'No fue posible consultar la auditoría de correos' });
  }
}

async function getById(req, res) {
  try {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'El identificador no es válido' });
    const mail = await repository().findOneBy({ ID: id });
    if (!mail) return res.status(404).json({ message: 'Registro de correo no encontrado' });
    res.json(serializeAudit(mail, { detail: true }));
  } catch (error) {
    res.status(500).json({ message: 'No fue posible obtener el detalle del correo' });
  }
}

async function getFilters(req, res) {
  try {
    const categories = await repository().createQueryBuilder('mail')
      .select('mail.category', 'category')
      .distinct(true)
      .orderBy('mail.category', 'ASC')
      .getRawMany();
    res.json({ statuses: AUDIT_STATUSES, categories: categories.map(({ category }) => category).filter(Boolean) });
  } catch (error) {
    res.status(500).json({ message: 'No fue posible obtener los filtros de auditoría' });
  }
}

module.exports = { list, getById, getFilters, parseAuditQuery, nextDate, AUDIT_STATUSES };

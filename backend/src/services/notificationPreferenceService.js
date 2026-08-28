'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { AppDataSource } = require('../database/data-source');
const NotificationPreferenceSchema = require('../entities/NotificationPreference');
const { normalizeEmail } = require('./emailQueueService');

const STUDENT_ATTENDANCE_CATEGORY = 'student_attendance';
const TOKEN_ISSUER = 'technovation-girls-chile';
const TOKEN_AUDIENCE = 'notification-unsubscribe';

const repository = () => AppDataSource.getRepository(NotificationPreferenceSchema);

function unsubscribeSecret() {
  return process.env.NOTIFICATION_UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || 'secret_key';
}

function notificationEmailHash(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error('El correo es requerido para gestionar sus preferencias');
  return crypto.createHmac('sha256', unsubscribeSecret()).update(`notification-email:${normalizedEmail}`).digest('hex');
}

function createUnsubscribeToken({ email, category = STUDENT_ATTENDANCE_CATEGORY, expiresIn = process.env.NOTIFICATION_UNSUBSCRIBE_TOKEN_TTL || '90d' }) {
  if (category !== STUDENT_ATTENDANCE_CATEGORY) throw new Error('Categoría de notificación no permitida');
  return jwt.sign(
    { purpose: 'unsubscribe', emailHash: notificationEmailHash(email), category, jti: crypto.randomUUID() },
    unsubscribeSecret(),
    { algorithm: 'HS256', expiresIn, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE },
  );
}

function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== 'string') throw new Error('El enlace de desuscripción no es válido');
  const payload = jwt.verify(token, unsubscribeSecret(), {
    algorithms: ['HS256'], issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE,
  });
  if (payload.purpose !== 'unsubscribe' || payload.category !== STUDENT_ATTENDANCE_CATEGORY || !payload.emailHash) {
    throw new Error('El enlace de desuscripción no es válido');
  }
  return { emailHash: payload.emailHash, category: payload.category };
}

function buildUnsubscribeUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const url = new URL('/notificaciones/desuscribir', frontendUrl);
  url.searchParams.set('token', token);
  return url.toString();
}

async function isUnsubscribed(email, category = STUDENT_ATTENDANCE_CATEGORY) {
  const preference = await repository().findOne({
    where: { emailHash: notificationEmailHash(email), category },
  });
  return Boolean(preference?.isUnsubscribed);
}

async function getUnsubscribeStatus(token) {
  const target = verifyUnsubscribeToken(token);
  const preference = await repository().findOne({ where: target });
  return { ...target, isUnsubscribed: Boolean(preference?.isUnsubscribed) };
}

async function unsubscribeByToken(token) {
  const target = verifyUnsubscribeToken(token);
  let preference = await repository().findOne({ where: target });
  if (preference?.isUnsubscribed) return { alreadyUnsubscribed: true };

  if (!preference) {
    preference = repository().create({ ...target, isUnsubscribed: true, unsubscribedAt: new Date() });
  } else {
    preference.isUnsubscribed = true;
    preference.unsubscribedAt = new Date();
  }
  await repository().save(preference);
  return { alreadyUnsubscribed: false };
}

module.exports = {
  STUDENT_ATTENDANCE_CATEGORY,
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
  isUnsubscribed,
  getUnsubscribeStatus,
  unsubscribeByToken,
  notificationEmailHash,
};

'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

function encryptionKey() {
  const value = process.env.SENSITIVE_DATA_ENCRYPTION_KEY;
  if (!value) throw new Error('SENSITIVE_DATA_ENCRYPTION_KEY no está configurada');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('SENSITIVE_DATA_ENCRYPTION_KEY debe ser una clave Base64 de 32 bytes');
  return key;
}

function hmacKey() {
  const value = process.env.SENSITIVE_DATA_HMAC_KEY;
  if (value) return Buffer.from(value, 'base64');
  return crypto.createHash('sha256').update(encryptionKey()).update('sensitive-data-hmac-v1').digest();
}

function normalize(value, kind) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  if (kind === 'email') return text.toLowerCase();
  if (kind === 'rut') return text.replace(/[.\s]/g, '').toUpperCase();
  return text;
}

function encrypt(value) {
  if (value === null || value === undefined || value === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join(':');
}

function decrypt(value) {
  if (!value) return null;
  const [version, ivValue, tagValue, encryptedValue] = String(value).split(':');
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue) throw new Error('Formato de dato cifrado no válido');
  const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

function blindIndex(value, kind) {
  const normalized = normalize(value, kind);
  if (!normalized) return null;
  return crypto.createHmac('sha256', hmacKey()).update(`${kind}:${normalized}`).digest('hex');
}

function protect(value, kind) {
  return { encrypted: encrypt(value), hash: blindIndex(value, kind) };
}

function reveal(entity, field) {
  if (!entity) return null;
  return entity[`${field}Encrypted`] ? decrypt(entity[`${field}Encrypted`]) : entity[field] || null;
}

function serializeSensitive(entity, fields) {
  if (!entity) return entity;
  const result = { ...entity };
  for (const field of fields) {
    result[field] = reveal(entity, field);
    delete result[`${field}Encrypted`];
    delete result[`${field}Hash`];
  }
  return result;
}

function protectGuardianData(data) {
  if (!data) return data;
  const result = { ...data };
  for (const field of ['email', 'rut']) {
    if (Object.prototype.hasOwnProperty.call(result, field)) {
      const protectedValue = protect(result[field], field);
      result[`${field}Encrypted`] = protectedValue.encrypted;
      result[`${field}Hash`] = protectedValue.hash;
      delete result[field];
    }
  }
  return result;
}

function revealGuardianData(data) {
  if (!data) return data;
  const result = { ...data };
  for (const field of ['email', 'rut']) {
    if (result[`${field}Encrypted`]) result[field] = decrypt(result[`${field}Encrypted`]);
    delete result[`${field}Encrypted`];
    delete result[`${field}Hash`];
  }
  return result;
}

module.exports = { encrypt, decrypt, blindIndex, protect, reveal, serializeSensitive, protectGuardianData, revealGuardianData };

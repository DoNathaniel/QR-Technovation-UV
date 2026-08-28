'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeEmail, uniqueEmails, retryDelay } = require('../src/services/emailQueueService');
const {
  buildQREmail,
  buildMentorQREmail,
  buildMentorAttendanceEmail,
  buildStudentArrivalEmail,
  buildStudentAttendanceEmail,
} = require('../src/services/emailService');
const {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  notificationEmailHash,
} = require('../src/services/notificationPreferenceService');
const { parseAuditQuery, nextDate } = require('../src/controllers/mailAuditController');
const { checkRole } = require('../src/middleware');

test('normaliza correos para evitar destinatarios duplicados por formato', () => {
  assert.equal(normalizeEmail('  NINA@Ejemplo.cl '), 'nina@ejemplo.cl');
  assert.equal(normalizeEmail(null), '');
});

test('los reintentos tienen espera creciente', () => {
  assert.equal(retryDelay(1), 60_000);
  assert.equal(retryDelay(2), 5 * 60_000);
  assert.equal(retryDelay(3), 30 * 60_000);
  assert.equal(retryDelay(10), 30 * 60_000);
});

test('deduplica los correos de niña y apoderado antes de encolar', () => {
  assert.deepEqual(
    uniqueEmails(' Nina@Ejemplo.cl ', 'nina@ejemplo.cl', 'apoderado@ejemplo.cl', null),
    ['nina@ejemplo.cl', 'apoderado@ejemplo.cl'],
  );
});

test('las plantillas producen trabajos completos para la cola', () => {
  const student = buildQREmail('Ana Pérez', 'https://cdn.example/qr.png');
  const mentor = buildMentorQREmail('María Díaz', 'https://cdn.example/mentor-qr.png');
  const attendance = buildMentorAttendanceEmail('María Díaz', 'entrada', '09:15', 'Admin UV', true);

  for (const message of [student, mentor, attendance]) {
    assert.ok(message.subject);
    assert.ok(message.htmlBody.includes('Technovation Girls Chile'));
  }
  assert.match(attendance.subject, /entrada/i);
});

test('el aviso de llegada es breve, muestra fecha y no permite inyectar HTML en el nombre', () => {
  const arrival = buildStudentArrivalEmail('<Ana>', '2026-08-27', '09:15:32', 'https://example.test/desuscribir');

  assert.equal(arrival.subject, 'Llegada registrada · Technovation Girls');
  assert.match(arrival.htmlBody, /Llegada registrada/);
  assert.match(arrival.htmlBody, /27\/08\/2026/);
  assert.match(arrival.htmlBody, /09:15/);
  assert.match(arrival.htmlBody, /&lt;Ana&gt;/);
  assert.doesNotMatch(arrival.htmlBody, /<strong><Ana>/);
  assert.match(arrival.htmlBody, /no deseas recibir más notificaciones de asistencia/i);
  assert.match(arrival.htmlBody, /https:\/\/example\.test\/desuscribir/);
});

test('el aviso de salida se identifica correctamente', () => {
  const departure = buildStudentAttendanceEmail('Ana Pérez', 'salida', '2026-08-27', '17:45:00');

  assert.equal(departure.subject, 'Salida registrada · Technovation Girls');
  assert.match(departure.htmlBody, /Tu salida fue registrada correctamente/);
});

test('los enlaces de desuscripción son firmados, no contienen el correo y vencen', () => {
  const token = createUnsubscribeToken({ email: 'Nina@Ejemplo.cl', expiresIn: '1h' });
  const payload = verifyUnsubscribeToken(token);

  assert.equal(payload.emailHash, notificationEmailHash('nina@ejemplo.cl'));
  assert.doesNotMatch(token, /nina@ejemplo\.cl/i);
  assert.throws(() => verifyUnsubscribeToken(`${token}x`));
  assert.throws(
    () => verifyUnsubscribeToken(createUnsubscribeToken({ email: 'nina@ejemplo.cl', expiresIn: '-1s' })),
    /jwt expired/,
  );
});

test('valida y limita los filtros de auditoría de correos', () => {
  const filters = parseAuditQuery({ page: '0', pageSize: '500', status: 'failed', recipient: ' ANA@EXAMPLE.CL ', dateFrom: '2026-08-01', dateTo: '2026-08-27' });

  assert.equal(filters.page, 1);
  assert.equal(filters.pageSize, 100);
  assert.equal(filters.recipient, 'ana@example.cl');
  assert.equal(nextDate('2026-08-27'), '2026-08-28');
  assert.throws(() => parseAuditQuery({ status: 'invented' }), /estado/);
  assert.throws(() => parseAuditQuery({ dateFrom: '2026-08-28', dateTo: '2026-08-27' }), /inicial/);
});

test('la auditoría permite admin y superadmin, pero bloquea voluntarios', () => {
  const middleware = checkRole('superadmin', 'admin');
  let passed = false;
  middleware({ user: { rol: 'admin' } }, {}, () => { passed = true; });
  assert.equal(passed, true);

  let statusCode = null;
  middleware({ user: { rol: 'voluntario' } }, { status(code) { statusCode = code; return this; }, json() {} }, () => {});
  assert.equal(statusCode, 403);
});

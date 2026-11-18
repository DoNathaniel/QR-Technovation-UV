'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { AppDataSource } = require('../src/database/data-source');
const controller = require('../src/controllers/mentorAttendanceController');
const User = require('../src/entities/User');
const Attendance = require('../src/entities/MentorAttendance');
const Season = require('../src/entities/Season');
const SeasonDate = require('../src/entities/SeasonDate');
const mentor = { ID: 12, rol: 'voluntario', temporadas: [1], nombre: 'Ana', apellido: 'UV' };
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
test('own entry rejects QR duplicates, enforces access and serializes concurrent attempts', async () => {
  const originalRepository = AppDataSource.getRepository;
  const originalTransaction = AppDataSource.transaction;
  const originalEnv = { ...process.env };
  Object.assign(process.env, { MENTOR_CHECKIN_LATITUDE: '-33', MENTOR_CHECKIN_LONGITUDE: '-71', MENTOR_CHECKIN_RADIUS_METERS: '150', MENTOR_CHECKIN_MAX_ACCURACY_METERS: '50' });
  let entries = [];
  let tail = Promise.resolve();
  let locks = 0;
  const repository = schema => {
    if (schema === User) return { findOne: async options => { if (options.lock?.mode === 'pessimistic_write') locks++; return mentor; } };
    if (schema === Season) return { findOne: async () => ({ ID: 1, activa: true }), find: async () => [{ ID: 1 }] };
    if (schema === SeasonDate) return { findOne: async () => null };
    if (schema === Attendance) return {
      findOne: async () => entries[0] || null,
      create: value => value,
      save: async value => { if (!value.ID) { value.ID = entries.length + 1; entries.push(value); } return value; },
    };
    throw new Error('Unexpected schema');
  };
  AppDataSource.getRepository = repository;
  AppDataSource.transaction = callback => {
    const result = tail.then(() => callback({ getRepository: repository }));
    tail = result.catch(() => {}); return result;
  };
  const request = (seasonID = 1) => ({ user: { id: 12 }, body: { mentorID: 999, seasonID, position: { latitude: -33, longitude: -71, accuracy: 10, timestamp: Date.now() } } });
  try {
    const forbidden = response(); await controller.registerMyEntry(request(2), forbidden);
    assert.equal(forbidden.statusCode, 403);
    entries = [{ ID: 1, tipo: 'entrada', metodo: 'qr' }];
    const duplicate = response(); await controller.registerMyEntry(request(), duplicate);
    assert.equal(duplicate.statusCode, 409);
    entries = [];
    const first = response(), second = response();
    await Promise.all([controller.registerMyEntry(request(), first), controller.registerMyEntry(request(), second)]);
    assert.deepEqual([first.statusCode, second.statusCode].sort(), [201, 409]);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].mentorID, 12);
    assert.equal(entries[0].tipo, 'entrada');
    assert.equal(entries[0].metodo, 'ubicacion');
    assert.equal(locks, 3);
  } finally {
    AppDataSource.getRepository = originalRepository;
    AppDataSource.transaction = originalTransaction;
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});

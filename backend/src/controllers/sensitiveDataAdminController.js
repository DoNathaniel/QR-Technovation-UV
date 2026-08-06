'use strict';

const { AppDataSource } = require('../database/data-source');
const StudentSchema = require('../entities/Student');
const GuardianSchema = require('../entities/Guardian');
const UserSchema = require('../entities/User');
const MigrationLogSchema = require('../entities/SensitiveDataMigrationLog');
const { protect, protectGuardianData } = require('../services/sensitiveDataService');

const repositories = () => ({
  students: AppDataSource.getRepository(StudentSchema),
  guardians: AppDataSource.getRepository(GuardianSchema),
  users: AppDataSource.getRepository(UserSchema),
  logs: AppDataSource.getRepository(MigrationLogSchema),
});

function hasPlainStudent(student) {
  const guardian = student.datosApoderado || {};
  return Boolean(
    (student.email && !student.emailEncrypted) ||
    (student.rut && !student.rutEncrypted) ||
    guardian.email || guardian.rut
  );
}

function hasPlainGuardian(guardian) {
  return Boolean((guardian.email && !guardian.emailEncrypted) || (guardian.rut && !guardian.rutEncrypted));
}

function hasPlainUser(user) {
  return Boolean(user.email && !user.emailEncrypted);
}

async function status() {
  const { students, guardians, users } = repositories();
  const [studentRows, guardianRows, userRows] = await Promise.all([
    students.find({ select: ['ID', 'email', 'emailEncrypted', 'rut', 'rutEncrypted', 'datosApoderado'] }),
    guardians.find({ select: ['ID', 'email', 'emailEncrypted', 'rut', 'rutEncrypted'] }),
    users.find({ select: ['ID', 'email', 'emailEncrypted'] }),
  ]);
  const count = (rows, predicate) => rows.filter(predicate).length;
  return {
    students: { total: studentRows.length, pending: count(studentRows, hasPlainStudent) },
    guardians: { total: guardianRows.length, pending: count(guardianRows, hasPlainGuardian) },
    users: { total: userRows.length, pending: count(userRows, hasPlainUser) },
  };
}

function migrateStudent(student) {
  if (student.email && !student.emailEncrypted) {
    const value = protect(student.email, 'email');
    student.emailEncrypted = value.encrypted;
    student.emailHash = value.hash;
    student.email = null;
  }
  if (student.rut && !student.rutEncrypted) {
    const value = protect(student.rut, 'rut');
    student.rutEncrypted = value.encrypted;
    student.rutHash = value.hash;
    student.rut = null;
  }
  if (student.datosApoderado?.email || student.datosApoderado?.rut) {
    student.datosApoderado = protectGuardianData(student.datosApoderado);
  }
}

function migrateGuardian(guardian) {
  for (const field of ['email', 'rut']) {
    if (guardian[field] && !guardian[`${field}Encrypted`]) {
      const value = protect(guardian[field], field);
      guardian[`${field}Encrypted`] = value.encrypted;
      guardian[`${field}Hash`] = value.hash;
      guardian[field] = null;
    }
  }
}

function migrateUser(user) {
  if (user.email && !user.emailEncrypted) {
    const value = protect(user.email, 'email');
    user.emailEncrypted = value.encrypted;
    user.emailHash = value.hash;
    user.email = null;
  }
}

async function getStatus(req, res) {
  try {
    res.json({ ...(await status()) });
  } catch (error) {
    res.status(500).json({ message: 'No fue posible obtener el estado de cifrado', error: error.message });
  }
}

async function runMigration(req, res) {
  const dryRun = Boolean(req.body?.dryRun);
  const batchSize = Math.min(Math.max(Number(req.body?.batchSize) || 100, 1), 500);
  try {
    const { students, guardians, users, logs } = repositories();
    const [studentRows, guardianRows, userRows] = await Promise.all([students.find(), guardians.find(), users.find()]);
    const candidates = [
      ...studentRows.filter(hasPlainStudent).slice(0, batchSize).map((row) => ({ repository: students, row, migrate: migrateStudent, type: 'students' })),
      ...guardianRows.filter(hasPlainGuardian).slice(0, batchSize).map((row) => ({ repository: guardians, row, migrate: migrateGuardian, type: 'guardians' })),
      ...userRows.filter(hasPlainUser).slice(0, batchSize).map((row) => ({ repository: users, row, migrate: migrateUser, type: 'users' })),
    ];
    const details = { students: 0, guardians: 0, users: 0, errors: [] };
    for (const candidate of candidates) {
      try {
        candidate.migrate(candidate.row);
        if (!dryRun) await candidate.repository.save(candidate.row);
        details[candidate.type] += 1;
      } catch (error) {
        details.errors.push({ type: candidate.type, id: candidate.row.ID, message: error.message });
      }
    }
    await logs.save(logs.create({
      userID: req.user.id,
      dryRun,
      processed: candidates.length - details.errors.length,
      failed: details.errors.length,
      details,
    }));
    res.json({ dryRun, batchSize, processed: candidates.length - details.errors.length, failed: details.errors.length, details, status: await status() });
  } catch (error) {
    res.status(500).json({ message: 'La migración no pudo ejecutarse', error: error.message });
  }
}

async function getLogs(req, res) {
  try {
    const { logs } = repositories();
    res.json(await logs.find({ order: { createdAt: 'DESC' }, take: 20 }));
  } catch (error) {
    res.status(500).json({ message: 'No fue posible obtener la auditoría', error: error.message });
  }
}

module.exports = { getStatus, runMigration, getLogs };

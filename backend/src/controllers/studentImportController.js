'use strict';

const crypto = require('crypto');
const XLSX = require('xlsx');
const { In } = require('typeorm');
const { AppDataSource } = require('../database/data-source');
const StudentSchema = require('../entities/Student');
const GuardianSchema = require('../entities/Guardian');
const SeasonSchema = require('../entities/Season');
const { blindIndex, protect, protectGuardianData } = require('../services/sensitiveDataService');

const previews = new Map();
const PREVIEW_TTL_MS = 20 * 60 * 1000;
const MAX_ROWS = 500;

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalized(value) {
  return text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function normalizeRut(value) {
  const raw = text(value).replace(/[.\s]/g, '').toUpperCase();
  if (!raw) return '';
  const match = raw.match(/^(\d{7,8})-?([0-9K])$/);
  return match ? `${match[1]}-${match[2]}` : raw;
}

function validRut(value) {
  const match = value.match(/^(\d{7,8})-?([0-9K])$/);
  if (!match) return false;
  let sum = 0;
  let factor = 2;
  for (const digit of [...match[1]].reverse()) {
    sum += Number(digit) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const expected = 11 - (sum % 11);
  const verifier = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return verifier === match[2];
}

function excelDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  const parsed = XLSX.SSF.parse_date_code(Number(value));
  if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  const source = text(value);
  const match = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  const date = new Date(source);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString().slice(0, 10);
}

function cell(row, names) {
  for (const name of names) {
    const key = Object.keys(row).find((candidate) => normalized(candidate) === normalized(name));
    if (key) return row[key];
  }
  return undefined;
}

function parseRows(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => normalized(name) === 'confirmadas');
  if (!sheetName) throw new Error('La plantilla debe contener una hoja llamada “Confirmadas”.');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false, dateNF: 'yyyy-mm-dd' });
  if (rows.length === 0) throw new Error('La hoja Confirmadas no tiene registros.');
  if (rows.length > MAX_ROWS) throw new Error(`La importación admite un máximo de ${MAX_ROWS} registros.`);

  return rows.filter((row) => text(cell(row, ['RUT alumna']))).map((row, index) => {
    const retiro = normalized(cell(row, ['RETIRO DE LA SEDE']));
    return {
      rowNumber: index + 2,
      nombres: text(cell(row, ['Primer Nombre'])),
      apellidos: text(cell(row, ['Apellido 1'])),
      email: text(cell(row, ['Correo alumna'])).toLowerCase(),
      rut: normalizeRut(cell(row, ['RUT alumna'])),
      fechaNac: excelDate(cell(row, ['FECHA NACIMIENTO'])),
      categoria: text(cell(row, ['CATEGORÍA'])),
      genero: text(cell(row, ['Género alumna'])),
      guardian: {
        nombres: text(cell(row, ['Nombre apoderado'])),
        // SheetJS renombra el segundo encabezado duplicado "Apellido 1" como "Apellido 1_1".
        // Se conserva la variante con punto por compatibilidad con otras exportaciones.
        apellidos: text(cell(row, ['Apellido 1_1', 'Apellido 1.1'])),
        email: text(cell(row, ['Correo apoderado'])).toLowerCase(),
        telefono: text(cell(row, ['Teléfono apoderado'])),
        rut: normalizeRut(cell(row, ['RUT apoderado'])),
      },
      retiroConApoderado: retiro === 'con apoderado' ? true : retiro === 'sola' ? false : null,
      retiroOriginal: text(cell(row, ['RETIRO DE LA SEDE'])),
      errors: [],
      warnings: [],
    };
  });
}

function validateRows(rows) {
  const rutRows = new Map();
  for (const row of rows) {
    if (!row.nombres || !row.apellidos) row.errors.push('Falta el nombre o apellido de la estudiante.');
    if (!validRut(row.rut)) row.errors.push('El RUT de la estudiante no es válido.');
    if (!row.email || !/^\S+@\S+\.\S+$/.test(row.email)) row.errors.push('El correo de la estudiante no es válido.');
    if (!['Beginner', 'Junior', 'Senior'].includes(row.categoria)) row.errors.push('La categoría debe ser Beginner, Junior o Senior.');
    if (!row.fechaNac) row.warnings.push('No se pudo leer la fecha de nacimiento.');
    if (normalized(row.genero) !== 'femenino') row.warnings.push('El género no es “Femenino”; revísalo antes de importar.');
    if (!row.guardian.nombres || !row.guardian.apellidos) row.errors.push('Falta el nombre o apellido del apoderado.');
    if (!validRut(row.guardian.rut)) row.errors.push('El RUT del apoderado no es válido.');
    if (!row.guardian.email || !/^\S+@\S+\.\S+$/.test(row.guardian.email)) row.errors.push('El correo del apoderado no es válido.');
    if (!row.guardian.telefono) row.warnings.push('Falta el teléfono del apoderado.');
    if (!row.retiroOriginal) row.warnings.push('Retiro sin definir; se importará como pendiente.');
    else if (!['con apoderado', 'sola'].includes(normalized(row.retiroOriginal))) row.warnings.push('Modalidad de retiro no reconocida; se importará como pendiente.');
    if (!rutRows.has(row.rut)) rutRows.set(row.rut, []);
    rutRows.get(row.rut).push(row);
  }
  for (const duplicateRows of rutRows.values()) {
    if (duplicateRows.length > 1) duplicateRows.forEach((row) => row.errors.push('El RUT de la estudiante está repetido en la plantilla.'));
  }
}

async function validateDatabaseRows(rows, seasonID) {
  const hashes = rows.map((row) => blindIndex(row.rut, 'rut')).filter(Boolean);
  if (!hashes.length) return;
  const existing = await AppDataSource.getRepository(StudentSchema).find({
    where: { seasonID, rutHash: In(hashes) },
    select: ['rutHash'],
  });
  const existingHashes = new Set(existing.map((student) => student.rutHash));
  rows.forEach((row) => {
    if (existingHashes.has(blindIndex(row.rut, 'rut'))) row.errors.push('Ya existe una estudiante con este RUT en la temporada seleccionada.');
  });
}

function publicRow(row) {
  return {
    rowNumber: row.rowNumber,
    nombres: row.nombres,
    apellidos: row.apellidos,
    email: row.email,
    rut: row.rut,
    fechaNac: row.fechaNac,
    categoria: row.categoria,
    guardianNombre: `${row.guardian.nombres} ${row.guardian.apellidos}`.trim(),
    guardianEmail: row.guardian.email,
    guardianRut: row.guardian.rut,
    retiroConApoderado: row.retiroConApoderado,
    retiroOriginal: row.retiroOriginal || 'Sin definir',
    errors: row.errors,
    warnings: row.warnings,
  };
}

function cleanupPreviews() {
  const now = Date.now();
  for (const [token, preview] of previews.entries()) if (preview.expiresAt < now) previews.delete(token);
}

async function preview(req, res) {
  try {
    cleanupPreviews();
    const seasonID = Number(req.query.seasonID);
    if (!Number.isInteger(seasonID) || seasonID <= 0) return res.status(400).json({ message: 'seasonID es requerido.' });
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ message: 'Adjunta un archivo Excel válido.' });
    const season = await AppDataSource.getRepository(SeasonSchema).findOne({ where: { ID: seasonID } });
    if (!season) return res.status(400).json({ message: 'La temporada seleccionada no existe.' });
    const rows = parseRows(req.body);
    validateRows(rows);
    await validateDatabaseRows(rows, seasonID);
    const token = crypto.randomUUID();
    previews.set(token, { userID: req.user.id, seasonID, rows, expiresAt: Date.now() + PREVIEW_TTL_MS });
    const invalid = rows.filter((row) => row.errors.length > 0).length;
    res.json({ token, expiresInMinutes: 20, total: rows.length, valid: rows.length - invalid, invalid, rows: rows.map(publicRow) });
  } catch (error) {
    res.status(400).json({ message: error.message || 'No se pudo leer la plantilla.' });
  }
}

async function commit(req, res) {
  const token = text(req.body?.token);
  const previewData = previews.get(token);
  if (!previewData || previewData.expiresAt < Date.now() || previewData.userID !== req.user.id) return res.status(400).json({ message: 'La vista previa expiró. Vuelve a cargar la plantilla.' });
  if (previewData.rows.some((row) => row.errors.length > 0)) return res.status(400).json({ message: 'Corrige los errores de la plantilla antes de importar.' });

  try {
    await AppDataSource.transaction(async (manager) => {
      const studentRepo = manager.getRepository(StudentSchema);
      const guardianRepo = manager.getRepository(GuardianSchema);
      for (const row of previewData.rows) {
        const studentEmail = protect(row.email, 'email');
        const studentRut = protect(row.rut, 'rut');
        const guardianEmail = protect(row.guardian.email, 'email');
        const guardianRut = protect(row.guardian.rut, 'rut');
        const guardian = await guardianRepo.save(guardianRepo.create({
          nombres: row.guardian.nombres, apellidos: row.guardian.apellidos, telefono: row.guardian.telefono,
          seasonID: previewData.seasonID, email: null, emailEncrypted: guardianEmail.encrypted, emailHash: guardianEmail.hash,
          rut: null, rutEncrypted: guardianRut.encrypted, rutHash: guardianRut.hash,
        }));
        await studentRepo.save(studentRepo.create({
          nombres: row.nombres, apellidos: row.apellidos, fechaNac: row.fechaNac, categoria: row.categoria,
          seasonID: previewData.seasonID, guardianID: guardian.ID, retiradoApoderado: row.retiroConApoderado,
          email: null, emailEncrypted: studentEmail.encrypted, emailHash: studentEmail.hash,
          rut: null, rutEncrypted: studentRut.encrypted, rutHash: studentRut.hash,
          datosApoderado: protectGuardianData(row.guardian),
          qrUrl: null,
        }));
      }
    });
    previews.delete(token);
    res.status(201).json({ message: 'Importación completada.', imported: previewData.rows.length, emailsSent: 0, qrGenerated: 0 });
  } catch (error) {
    res.status(500).json({ message: 'No se importó ningún registro: ' + error.message });
  }
}

module.exports = { preview, commit };

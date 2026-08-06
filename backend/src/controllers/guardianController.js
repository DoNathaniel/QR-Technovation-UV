'use strict';
const { AppDataSource } = require('../database/data-source');
const GuardianSchema = require('../entities/Guardian');
const StudentSchema = require('../entities/Student');
const { protect, serializeSensitive, revealGuardianData } = require('../services/sensitiveDataService');

const guardianRepository = () => AppDataSource.getRepository(GuardianSchema);
const studentRepository = () => AppDataSource.getRepository(StudentSchema);

function serializeGuardian(guardian) {
  const result = serializeSensitive(guardian, ['email', 'rut']);
  if (result.estudiantes) result.estudiantes = result.estudiantes.map(serializeStudent);
  return result;
}

function serializeStudent(student) {
  const result = serializeSensitive(student, ['email', 'rut']);
  result.datosApoderado = revealGuardianData(result.datosApoderado);
  return result;
}

function guardianValues(data) {
  const email = protect(data.email, 'email');
  const rut = protect(data.rut, 'rut');
  const result = { ...data };
  delete result.email;
  delete result.rut;
  return {
    ...result,
    email: null,
    emailEncrypted: email.encrypted,
    emailHash: email.hash,
    rut: null,
    rutEncrypted: rut.encrypted,
    rutHash: rut.hash,
  };
}

async function getAll(req, res) {
  try {
    const seasonID = req.query.seasonID;
    const where = seasonID ? { seasonID: parseInt(seasonID) } : {};
    const guardians = await guardianRepository().find({ where });
    res.json(guardians.map(serializeGuardian));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener apoderados', error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const guardian = await guardianRepository().findOne({ 
      where: { ID: parseInt(id) },
      relations: ['estudiantes']
    });
    if (!guardian) {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }
    res.json(serializeGuardian(guardian));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener apoderado', error: error.message });
  }
}

async function getStudentsByGuardianId(req, res) {
  try {
    const { id } = req.params;
    const { seasonID } = req.query;
    if (!seasonID) {
      return res.status(400).json({ message: 'seasonID es requerido' });
    }
    // Busca estudiantes con el guardianID y la temporada indicada
    const students = await studentRepository().find({ where: { guardianID: parseInt(id), seasonID: parseInt(seasonID) } });
    res.json(students.map(serializeStudent));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estudiantes hermanas', error: error.message });
  }
}

async function create(req, res) {
  try {
    const guardian = guardianRepository().create(guardianValues(req.body));
    const result = await guardianRepository().save(guardian);
    res.status(201).json(serializeGuardian(result));
  } catch (error) {
    res.status(500).json({ message: 'Error al crear apoderado', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const guardian = await guardianRepository().findOne({ where: { ID: parseInt(id) } });
    if (!guardian) {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }
    Object.assign(guardian, guardianValues(req.body));
    const result = await guardianRepository().save(guardian);
    res.json(serializeGuardian(result));
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar apoderado', error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await guardianRepository().delete(parseInt(id));
    res.json({ message: 'Apoderado eliminado', result });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar apoderado', error: error.message });
  }
}

module.exports = { getAll, getById, getStudentsByGuardianId, create, update, remove };

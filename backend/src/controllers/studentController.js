'use strict';
const { AppDataSource } = require('../database/data-source');
const StudentSchema = require('../entities/Student');

const studentRepository = () => AppDataSource.getRepository(StudentSchema);

async function getAll(req, res) {
  try {
    const seasonID = req.query.seasonID;
    const categoria = req.query.categoria;
    
    const where = {};
    if (seasonID) where.seasonID = parseInt(seasonID);
    if (categoria) where.categoria = categoria;

    const students = await studentRepository().find({ where });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estudiantes', error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estudiante', error: error.message });
  }
}

async function create(req, res) {
  try {
    const student = studentRepository().create(req.body);
    const result = await studentRepository().save(student);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear estudiante', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    Object.assign(student, req.body);
    const result = await studentRepository().save(student);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estudiante', error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await studentRepository().delete(parseInt(id));
    res.json({ message: 'Estudiante eliminado', result });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar estudiante', error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
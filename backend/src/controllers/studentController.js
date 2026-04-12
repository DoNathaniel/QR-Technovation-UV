'use strict';
const { AppDataSource } = require('../database/data-source');
const StudentSchema = require('../entities/Student');

const studentRepository = () => AppDataSource.getRepository(StudentSchema);

function validateRUT(rut) {
  const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/i;
  return rutRegex.test(rut);
}

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
    const { datosApoderado, seasonID } = req.body;
    console.log(seasonID)
    
    if (!seasonID) {
      return res.status(400).json({ message: 'seasonID es requerido' });
    }
    

    const SeasonSchema = require('../entities/Season');
    const seasonRepo = AppDataSource.getRepository(SeasonSchema);
    const season = await seasonRepo.findOne({ where: { ID: seasonID } });
    
    if (!season) {
      return res.status(400).json({ message: 'Temporada no encontrada con ID: ' + seasonID });
    }
    
    let guardianID = req.body.guardianID;
    
    if (datosApoderado && datosApoderado.nombres) {
      const GuardianSchema = require('../entities/Guardian');
      const guardianRepo = AppDataSource.getRepository(GuardianSchema);
      
      let guardian = null;
      if (guardianID) {
        guardian = await guardianRepo.findOne({ where: { ID: guardianID } });
      }
      
      if (!guardian) {
        guardian = guardianRepo.create({
          nombres: datosApoderado.nombres,
          apellidos: datosApoderado.apellidos || '',
          email: datosApoderado.email || '',
          telefono: datosApoderado.telefono || '',
          rut: datosApoderado.rut || '',
          seasonID: req.body.seasonID,
        });
        guardian = await guardianRepo.save(guardian);
      }
      
      guardianID = guardian.ID;
    }
    
    const student = studentRepository().create({
      ...req.body,
      guardianID,
      datosApoderado: datosApoderado && datosApoderado.nombres ? datosApoderado : null,
    });
    const result = await studentRepository().save(student);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Error al crear estudiante', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { datosApoderado, seasonID } = req.body;
    
    if (!seasonID) {
      return res.status(400).json({ message: 'seasonID es requerido' });
    }
    
    const SeasonSchema = require('../entities/Season');
    const seasonRepo = AppDataSource.getRepository(SeasonSchema);
    const season = await seasonRepo.findOne({ where: { ID: seasonID } });
    
    if (!season) {
      return res.status(400).json({ message: 'Temporada no encontrada' });
    }
    
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    
    let guardianID = req.body.guardianID;
    
    if (datosApoderado && datosApoderado.nombres) {
      const GuardianSchema = require('../entities/Guardian');
      const guardianRepo = AppDataSource.getRepository(GuardianSchema);
      
      let guardian = null;
      if (guardianID) {
        guardian = await guardianRepo.findOne({ where: { ID: guardianID } });
      }
      
      if (!guardian) {
        guardian = guardianRepo.create({
          nombres: datosApoderado.nombres,
          apellidos: datosApoderado.apellidos || '',
          email: datosApoderado.email || '',
          telefono: datosApoderado.telefono || '',
          rut: datosApoderado.rut || '',
          seasonID: req.body.seasonID,
        });
        guardian = await guardianRepo.save(guardian);
      }
      
      guardianID = guardian.ID;
    }
    
    Object.assign(student, req.body, { guardianID });
    const result = await studentRepository().save(student);
    res.json(result);
  } catch (error) {
    console.error('Error updating student:', error);
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

async function resendQR(req, res) {
  try {
    const { id } = req.params;
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    console.log(`QR reenviado para estudiante ID: ${id} - ${student.nombres} ${student.apellidos}`);
    res.json({ message: 'QR reenviado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al reenviar QR', error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove, resendQR };
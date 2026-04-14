'use strict';
const { AppDataSource } = require('../database/data-source');
const StudentSchema = require('../entities/Student');
const { generateQR } = require('../services/qrService');
const { sendQREmail } = require('../services/emailService');

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

    const students = await studentRepository().find({ 
      where,
      relations: ['team']
    });
    
    const result = students.map(s => ({
      ...s,
      teamID: s.team?.ID || null,
      teamNombre: s.team?.nombre || null,
    }));
    
    res.json(result);
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
    const { datosApoderado, seasonID, rut } = req.body;
    console.log(seasonID)
    
    if (!seasonID) {
      return res.status(400).json({ message: 'seasonID es requerido' });
    }

    if (rut) {
      const existingStudent = await studentRepository().findOne({
        where: { rut: rut.trim(), seasonID: parseInt(seasonID) }
      });
      if (existingStudent) {
        return res.status(400).json({ message: 'Ya existe un estudiante con ese RUT en esta temporada' });
      }
    }
    

    const SeasonSchema = require('../entities/Season');
    const seasonRepo = AppDataSource.getRepository(SeasonSchema);
    const season = await seasonRepo.findOne({ where: { ID: seasonID } });
    
    if (!season) {
      return res.status(400).json({ message: 'Temporada no encontrada con ID: ' + seasonID });
    }
    
    let guardianID = req.body.guardianID;
    let guardian_email = null;

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
      } else {
        guardian_email = guardian.email;
      }
      
      guardianID = guardian.ID;
    } else if(guardianID) {
      const GuardianSchema = require('../entities/Guardian');
      const guardianRepo = AppDataSource.getRepository(GuardianSchema);
      let guardian = null;
      
      guardian = await guardianRepo.findOne({ where: { ID: guardianID } });
      if(guardian) {
        guardian_email = guardian.email;
      }
    }
    
    const student = studentRepository().create({
      ...req.body,
      guardianID,
      datosApoderado: datosApoderado && datosApoderado.nombres ? datosApoderado : null,
    });
    const result = await studentRepository().save(student);

    // Generar QR automaticamente al crear estudiante y subirlo al CDN
    let cdnUrl = null;
    try {
      cdnUrl = await generateQR(seasonID, result.ID);
      result.qrUrl = cdnUrl;
      await studentRepository().save(result);
      console.log(`[QR] QR generado y subido al CDN para estudiante ${result.ID}`);
    } catch (qrError) {
      console.error(`[QR] Error generando QR para estudiante ${result.ID}:`, qrError.message);
      // No bloquear la creacion del estudiante si falla el QR
    }

    // Enviar QR por email al estudiante y al apoderado (sin duplicados)
    if (cdnUrl) {
      const studentName = `${result.nombres} ${result.apellidos}`;
      const studentEmail = result.email || null;
      const guardianEmail = guardian_email || (datosApoderado && datosApoderado.email) || null;

      const recipients = new Set();
      if (studentEmail) recipients.add(studentEmail);
      if (guardianEmail) recipients.add(guardianEmail);

      for (const email of recipients) {
        try {
          await sendQREmail(email, studentName, cdnUrl);
        } catch (emailError) {
          console.error(`[Email] Error enviando QR a ${email}:`, emailError.message);
          // No bloquear la creacion del estudiante si falla el email
        }
      }
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Error al crear estudiante', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { datosApoderado, seasonID, rut } = req.body;
    
    if (!seasonID) {
      return res.status(400).json({ message: 'seasonID es requerido' });
    }

    if (rut) {
      const existingStudent = await studentRepository().findOne({
        where: { rut: rut.trim(), seasonID: parseInt(seasonID) }
      });
      if (existingStudent && existingStudent.ID !== parseInt(id)) {
        return res.status(400).json({ message: 'Ya existe un estudiante con ese RUT en esta temporada' });
      }
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

    // Si no tiene QR en CDN, generarlo ahora
    let qrUrl = student.qrUrl;
    if (!qrUrl) {
      qrUrl = await generateQR(student.seasonID, student.ID);
      student.qrUrl = qrUrl;
      await studentRepository().save(student);
    }

    // Enviar QR al estudiante y al apoderado (sin duplicados)
    const studentEmail = student.email || null;
    const guardianEmail = (student.datosApoderado && student.datosApoderado.email) || null;

    const recipients = new Set();
    if (studentEmail) recipients.add(studentEmail);
    if (guardianEmail) recipients.add(guardianEmail);

    if (recipients.size === 0) {
      return res.status(400).json({
        message: 'No hay email disponible para este estudiante ni su apoderado',
      });
    }

    const studentName = `${student.nombres} ${student.apellidos}`;
    const sent = [];
    for (const email of recipients) {
      await sendQREmail(email, studentName, qrUrl);
      sent.push(email);
    }

    console.log(`[QR] Reenviado para estudiante ID: ${id} - ${studentName} a ${sent.join(', ')}`);
    res.json({ message: `QR reenviado exitosamente a ${sent.join(', ')}` });
  } catch (error) {
    console.error('[QR] Error al reenviar QR:', error.message);
    res.status(500).json({ message: 'Error al reenviar QR', error: error.message });
  }
}

async function getQR(req, res) {
  try {
    const { id } = req.params;
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    // Si no tiene QR en CDN, generarlo ahora
    let qrUrl = student.qrUrl;
    if (!qrUrl) {
      qrUrl = await generateQR(student.seasonID, student.ID);
      student.qrUrl = qrUrl;
      await studentRepository().save(student);
    }

    // Redirect a la URL del CDN
    res.redirect(qrUrl);
  } catch (error) {
    console.error('[QR] Error al obtener QR:', error.message);
    res.status(500).json({ message: 'Error al obtener QR', error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove, resendQR, getQR };
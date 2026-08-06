'use strict';
const { AppDataSource } = require('../database/data-source');
const StudentSchema = require('../entities/Student');
const { generateQR } = require('../services/qrService');
const { sendQREmail } = require('../services/emailService');
const GuardianSchema = require('../entities/Guardian');
const { blindIndex, protect, reveal, serializeSensitive, protectGuardianData, revealGuardianData } = require('../services/sensitiveDataService');

const studentRepository = () => AppDataSource.getRepository(StudentSchema);
const guardianRepository = () => AppDataSource.getRepository(GuardianSchema);

function validateRUT(rut) {
  const rutRegex = /^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/i;
  return rutRegex.test(rut);
}

function serializeStudent(student) {
  const result = serializeSensitive(student, ['email', 'rut']);
  result.datosApoderado = revealGuardianData(result.datosApoderado);
  return result;
}

function studentValues(data, rut) {
  const email = protect(data.email, 'email');
  const protectedRut = protect(rut, 'rut');
  const values = { ...data };
  delete values.email;
  return {
    ...values,
    email: null,
    emailEncrypted: email.encrypted,
    emailHash: email.hash,
    rut: null,
    rutEncrypted: protectedRut.encrypted,
    rutHash: protectedRut.hash,
  };
}

function guardianValues(data, seasonID) {
  const email = protect(data.email, 'email');
  const rut = protect(data.rut, 'rut');
  return {
    nombres: data.nombres,
    apellidos: data.apellidos || '',
    telefono: data.telefono || '',
    seasonID,
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
    const categoria = req.query.categoria;
    
    const where = {};
    if (seasonID) where.seasonID = parseInt(seasonID);
    if (categoria) where.categoria = categoria;

    const students = await studentRepository().find({ 
      where,
      relations: ['team']
    });
    
    const result = students.map(s => ({
      ...serializeStudent(s),
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
    res.json(serializeStudent(student));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estudiante', error: error.message });
  }
}

async function create(req, res) {
  try {
    const { datosApoderado, seasonID, rut, retiradoPrograma, retiradoPorUserID, retiradoEn, ...studentData } = req.body;
    if (!seasonID) {
      return res.status(400).json({ message: 'seasonID es requerido' });
    }

    if (rut) {
      const existingStudent = await studentRepository().findOne({
        where: [
          { rutHash: blindIndex(rut, 'rut'), seasonID: parseInt(seasonID) },
          { rut: rut.trim(), seasonID: parseInt(seasonID) },
        ]
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
        guardian = guardianRepo.create(guardianValues(datosApoderado, req.body.seasonID));
        guardian = await guardianRepo.save(guardian);
      } else {
        guardian_email = reveal(guardian, 'email');
      }
      
      guardianID = guardian.ID;
    } else if(guardianID) {
      const GuardianSchema = require('../entities/Guardian');
      const guardianRepo = AppDataSource.getRepository(GuardianSchema);
      let guardian = null;
      
      guardian = await guardianRepo.findOne({ where: { ID: guardianID } });
      if(guardian) {
        guardian_email = reveal(guardian, 'email');
      }
    }
    
    const student = studentRepository().create({
      ...studentValues(studentData, rut),
      seasonID: parseInt(seasonID),
      guardianID,
      datosApoderado: datosApoderado && datosApoderado.nombres ? protectGuardianData(datosApoderado) : null,
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
      const studentEmail = reveal(result, 'email');
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

    res.status(201).json(serializeStudent(result));
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ message: 'Error al crear estudiante', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { datosApoderado, seasonID, rut, retiradoPrograma, retiradoPorUserID, retiradoEn, ...studentData } = req.body;
    
    if (!seasonID) {
      return res.status(400).json({ message: 'seasonID es requerido' });
    }

    if (rut) {
      const existingStudent = await studentRepository().findOne({
        where: [
          { rutHash: blindIndex(rut, 'rut'), seasonID: parseInt(seasonID) },
          { rut: rut.trim(), seasonID: parseInt(seasonID) },
        ]
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
        guardian = guardianRepo.create(guardianValues(datosApoderado, req.body.seasonID));
        guardian = await guardianRepo.save(guardian);
      }
      
      guardianID = guardian.ID;
    }
    
    Object.assign(student, studentValues(studentData, rut), {
      seasonID: parseInt(seasonID),
      guardianID,
      datosApoderado: datosApoderado && datosApoderado.nombres ? protectGuardianData(datosApoderado) : null,
    });
    const result = await studentRepository().save(student);
    res.json(serializeStudent(result));
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

async function setRetiroPrograma(req, res) {
  try {
    const { id } = req.params;
    const { retiradoPrograma = true } = req.body || {};
    const actingUserID = req.user?.id || null;

    if (typeof retiradoPrograma !== 'boolean') {
      return res.status(400).json({ message: 'retiradoPrograma debe ser booleano' });
    }

    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    student.retiradoPrograma = retiradoPrograma;
    student.retiradoPorUserID = retiradoPrograma ? actingUserID : null;
    student.retiradoEn = retiradoPrograma ? new Date() : null;

    const result = await studentRepository().save(student);

    res.json({
      message: retiradoPrograma ? 'Estudiante retirado del programa' : 'Retiro del programa revertido',
      student: serializeStudent(result),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar retiro del programa', error: error.message });
  }
}

async function resendQR(req, res) {
  try {
    const { id } = req.params;
    const { destino } = req.body; // 'estudiante', 'apoderado', 'ambos' (por defecto)
    
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    const guardian = await guardianRepository().findOne({ where: { ID: parseInt(student.guardianID) } });

    // Reenviar nunca genera ni regenera el QR. La URL debe existir primero.
    const qrUrl = student.qrUrl;
    if (!qrUrl) {
      return res.status(409).json({
        message: 'La estudiante no tiene un QR generado. Usa la opción Generar QR antes de reenviar.',
      });
    }

    // Determinar destinatarios según parámetro destino
    const studentEmail = reveal(student, 'email');
    const guardianEmail = (guardian && reveal(guardian, 'email')) || (revealGuardianData(student.datosApoderado)?.email) || null;

    const recipients = new Set();
    
    const dest = destino || 'ambos';
    if (dest === 'estudiante' || dest === 'ambos') {
      if (studentEmail) recipients.add(studentEmail);
    }
    if (dest === 'apoderado' || dest === 'ambos') {
      if (guardianEmail && guardianEmail !== studentEmail) recipients.add(guardianEmail);
    }

    if (recipients.size === 0) {
      return res.status(400).json({
        message: 'No hay email disponible para el destino seleccionado',
      });
    }

    const studentName = `${student.nombres} ${student.apellidos}`;
    const sent = [];
    for (const email of recipients) {
      await sendQREmail(email, studentName, qrUrl);
      sent.push(email);
    }

    console.log(`[QR] Reenviado para estudiante ID: ${id} - ${studentName} a ${sent.join(', ')} (destino: ${dest})`);
    res.json({ message: `QR reenviado exitosamente a ${sent.join(', ')}` });
  } catch (error) {
    console.log(error)
    console.error('[QR] Error al reenviar QR:', error.message);
    res.status(500).json({ message: 'Error al reenviar QR', error: error.message });
  }
}

async function generateStudentQR(req, res) {
  try {
    const { id } = req.params;
    const force = Boolean(req.body?.force);
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    if (student.qrUrl && !force) {
      return res.json({
        message: 'La estudiante ya tiene un QR generado.',
        qrUrl: student.qrUrl,
        generated: false,
      });
    }

    student.qrUrl = await generateQR(student.seasonID, student.ID);
    await studentRepository().save(student);
    res.json({
      message: force ? 'QR regenerado y URL actualizada.' : 'QR generado y URL guardada.',
      qrUrl: student.qrUrl,
      generated: true,
    });
  } catch (error) {
    console.error('[QR] Error al generar QR:', error.message);
    res.status(500).json({ message: 'Error al generar QR', error: error.message });
  }
}

async function getQR(req, res) {
  try {
    const { id } = req.params;
    const student = await studentRepository().findOne({ where: { ID: parseInt(id) } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    if (!student.qrUrl) {
      return res.status(404).json({ message: 'La estudiante no tiene un QR generado' });
    }

    res.redirect(student.qrUrl);
  } catch (error) {
    console.log(error)
    console.error('[QR] Error al obtener QR:', error.message);
    res.status(500).json({ message: 'Error al obtener QR', error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove, resendQR, generateStudentQR, getQR, setRetiroPrograma };

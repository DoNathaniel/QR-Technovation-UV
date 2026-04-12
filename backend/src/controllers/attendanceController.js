'use strict';
const { AppDataSource } = require('../database/data-source');
const AttendanceSchema = require('../entities/Attendance');
const SeasonDateSchema = require('../entities/SeasonDate');
const StudentSchema = require('../entities/Student');

const attendanceRepository = () => AppDataSource.getRepository(AttendanceSchema);
const seasonDateRepository = () => AppDataSource.getRepository(SeasonDateSchema);
const studentRepository = () => AppDataSource.getRepository(StudentSchema);

async function register(req, res) {
  try {
    const { studentID, userID } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Load student to get seasonID for the socket room
    const student = await studentRepository().findOne({ where: { ID: studentID } });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrada' });
    }

    let seasonDate = await seasonDateRepository().findOne({ 
      where: { fecha: today } 
    });

    if (!seasonDate) {
      seasonDate = seasonDateRepository().create({ fecha: today, seasonID: student.seasonID });
      seasonDate = await seasonDateRepository().save(seasonDate);
    }

    const lastAttendance = await attendanceRepository().findOne({
      where: { studentID, seasonDateID: seasonDate.ID },
      order: { createdAt: 'DESC' }
    });

    const tipo = lastAttendance && lastAttendance.tipo === 'entrada' ? 'salida' : 'entrada';
    const hora = new Date().toTimeString().split(' ')[0];

    const attendance = attendanceRepository().create({
      tipo,
      hora,
      studentID,
      seasonDateID: seasonDate.ID,
      userID
    });

    const result = await attendanceRepository().save(attendance);

    // Attach student data for the socket event and response
    result.student = student;

    // Emit real-time event to all clients in the season room
    if (req.io) {
      req.io.to(`season:${student.seasonID}`).emit('attendance-registered', result);
    }

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar asistencia', error: error.message });
  }
}

async function getByDate(req, res) {
  try {
    const { date } = req.params;
    const seasonDate = await seasonDateRepository().findOne({ where: { fecha: date } });
    
    if (!seasonDate) {
      return res.json([]);
    }

    const attendances = await attendanceRepository().find({
      where: { seasonDateID: seasonDate.ID },
      relations: ['student']
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener asistencia', error: error.message });
  }
}

async function getByStudent(req, res) {
  try {
    const { studentID } = req.params;
    const attendances = await attendanceRepository().find({
      where: { studentID: parseInt(studentID) },
      order: { createdAt: 'DESC' }
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial', error: error.message });
  }
}

async function getStats(req, res) {
  try {
    const { seasonID } = req.query;
    const today = new Date().toISOString().split('T')[0];
    
    const totalEstudiantes = await studentRepository().count({
      where: { seasonID: parseInt(seasonID) }
    });

    const seasonDate = await seasonDateRepository().findOne({ 
      where: { fecha: today, seasonID: parseInt(seasonID) } 
    });

    if (!seasonDate) {
      return res.json({
        totalEstudiantes,
        presentesHoy: 0,
        entradasHoy: 0,
        salidasHoy: 0
      });
    }

    const allAttendances = await attendanceRepository().find({
      where: { seasonDateID: seasonDate.ID }
    });

    const estudiantesPresentes = new Set();
    let entradasHoy = 0;
    let salidasHoy = 0;

    allAttendances.forEach(att => {
      if (att.tipo === 'entrada') {
        entradasHoy++;
        estudiantesPresentes.add(att.studentID);
      } else {
        salidasHoy++;
        if (estudiantesPresentes.has(att.studentID)) {
          estudiantesPresentes.delete(att.studentID);
        }
      }
    });

    res.json({
      totalEstudiantes,
      presentesHoy: estudiantesPresentes.size,
      entradasHoy,
      salidasHoy
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
}

module.exports = { register, getByDate, getByStudent, getStats };
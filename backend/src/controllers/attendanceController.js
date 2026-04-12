'use strict';
const { AppDataSource } = require('../database/data-source');
const AttendanceSchema = require('../entities/Attendance');
const SeasonDateSchema = require('../entities/SeasonDate');

const attendanceRepository = () => AppDataSource.getRepository(AttendanceSchema);
const seasonDateRepository = () => AppDataSource.getRepository(SeasonDateSchema);

async function register(req, res) {
  try {
    const { studentID, userID } = req.body;
    const today = new Date().toISOString().split('T')[0];

    let seasonDate = await seasonDateRepository().findOne({ 
      where: { fecha: today } 
    });

    if (!seasonDate) {
      seasonDate = seasonDateRepository().create({ fecha: today });
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

module.exports = { register, getByDate, getByStudent };
'use strict';
const { AppDataSource } = require('../database/data-source');
const MentorAttendanceSchema = require('../entities/MentorAttendance');
const UserSchema = require('../entities/User');
const SeasonDateSchema = require('../entities/SeasonDate');
const { reveal, serializeSensitive } = require('../services/sensitiveDataService');
const { sendMentorAttendanceEmail } = require('../services/emailService');
const { normalizeSeasonIds } = require('../utils/seasonAccess');

const attendanceRepository = () => AppDataSource.getRepository(MentorAttendanceSchema);
const userRepository = () => AppDataSource.getRepository(UserSchema);
const seasonDateRepository = () => AppDataSource.getRepository(SeasonDateSchema);

function localDateAndTime() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());

  const value = Object.fromEntries(
    parts
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value: partValue }) => [type, partValue]),
  );

  return {
    fecha: `${value.year}-${value.month}-${value.day}`,
    hora: `${value.hour}:${value.minute}:${value.second}`,
  };
}

function serializeUser(user) {
  return serializeSensitive(user, ['email']);
}

function serializeAttendance(attendance) {
  return {
    ...attendance,
    mentor: attendance.mentor ? serializeUser(attendance.mentor) : undefined,
    scannedBy: attendance.scannedBy ? serializeUser(attendance.scannedBy) : undefined,
  };
}

async function registerFromQR(req, res) {
  try {
    const qrContent = String(req.body?.qrContent || '').trim();
    const seasonID = Number(req.body?.seasonID);
    if (!Number.isInteger(seasonID) || seasonID <= 0) {
      return res.status(400).json({ message: 'Debes seleccionar una temporada para registrar la asistencia' });
    }
    const match = qrContent.match(/^users\/user_(\d+)\.png$/);
    if (!match) {
      return res.status(400).json({ message: 'El código QR no corresponde a un integrante del equipo' });
    }

    const mentorID = Number(match[1]);
    const [mentor, scannedBy] = await Promise.all([
      userRepository().findOne({ where: { ID: mentorID } }),
      userRepository().findOne({ where: { ID: req.user.id } }),
    ]);
    if (!mentor || !['voluntario', 'admin'].includes(mentor.rol)) {
      return res.status(404).json({ message: 'Integrante del equipo no encontrado' });
    }
    if (!scannedBy) {
      return res.status(401).json({ message: 'Usuario que registra la asistencia no encontrado' });
    }

    const { fecha, hora } = localDateAndTime();
    const seasonDate = await seasonDateRepository().findOne({ where: { seasonID, fecha } });
    const esFechaPlanificada = Boolean(seasonDate?.activa);
    const lastAttendance = await attendanceRepository().findOne({
      where: { mentorID, fecha, seasonID },
      order: { createdAt: 'DESC' },
    });
    const tipo = lastAttendance?.tipo === 'entrada' ? 'salida' : 'entrada';
    const attendance = await attendanceRepository().save(attendanceRepository().create({
      tipo, fecha, hora, seasonID, seasonDateID: seasonDate?.ID || null, esFechaPlanificada,
      mentorID, scannedByUserID: scannedBy.ID,
    }));

    attendance.mentor = mentor;
    attendance.scannedBy = scannedBy;
    let emailSent = true;
    try {
      const mentorEmail = reveal(mentor, 'email');
      if (!mentorEmail) throw new Error('El integrante no tiene correo configurado');
      await sendMentorAttendanceEmail(
        mentorEmail,
        `${mentor.nombre} ${mentor.apellido}`,
        tipo,
        hora.slice(0, 5),
        `${scannedBy.nombre} ${scannedBy.apellido}`,
        esFechaPlanificada,
      );
    } catch (emailError) {
      emailSent = false;
      console.error('[Asistencia mentores] No se pudo enviar el correo:', emailError.message);
    }
    attendance.emailSent = emailSent;
    await attendanceRepository().save(attendance);

    res.status(201).json({
      ...serializeAttendance(attendance),
      emailSent,
      message: emailSent
        ? `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada y correo enviado.`
        : `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada, pero no se pudo enviar el correo.`,
    });
  } catch (error) {
    console.error('[Asistencia mentores] Error al registrar:', error.message);
    res.status(500).json({ message: 'Error al registrar la asistencia del equipo', error: error.message });
  }
}

async function getByDate(req, res) {
  try {
    const { fecha, seasonID } = req.query;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) ? fecha : localDateAndTime().fecha;
    const normalizedSeasonID = Number(seasonID);
    if (!Number.isInteger(normalizedSeasonID) || normalizedSeasonID <= 0) {
      return res.status(400).json({ message: 'Debes seleccionar una temporada para consultar la asistencia' });
    }
    const attendances = await attendanceRepository().find({
      where: { fecha: date, seasonID: normalizedSeasonID },
      relations: ['mentor', 'scannedBy'],
      order: { createdAt: 'DESC' },
    });
    res.json(attendances.map(serializeAttendance));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la asistencia del equipo', error: error.message });
  }
}

async function getMine(req, res) {
  try {
    const seasonID = Number(req.query.seasonID);
    if (!Number.isInteger(seasonID) || seasonID <= 0) {
      return res.status(400).json({ message: 'Debes seleccionar una temporada para consultar tus registros' });
    }
    const attendances = await attendanceRepository().find({
      where: { mentorID: req.user.id, seasonID },
      relations: ['scannedBy'],
      order: { fecha: 'DESC', createdAt: 'DESC' },
    });
    res.json(attendances.map(serializeAttendance));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tus registros de asistencia', error: error.message });
  }
}

async function getDashboard(req, res) {
  try {
    const { fecha, seasonID } = req.query;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(fecha || '')) ? fecha : localDateAndTime().fecha;
    const isGlobal = !seasonID || seasonID === 'global';
    const normalizedSeasonID = Number(seasonID);
    if (!isGlobal && (!Number.isInteger(normalizedSeasonID) || normalizedSeasonID <= 0)) {
      return res.status(400).json({ message: 'La temporada seleccionada no es válida' });
    }

    const [allUsers, attendances] = await Promise.all([
      userRepository().find({ select: ['ID', 'nombre', 'apellido', 'rol', 'temporadas'] }),
      attendanceRepository().find({
        where: isGlobal ? { fecha: date } : { fecha: date, seasonID: normalizedSeasonID },
        relations: ['mentor', 'scannedBy'],
        order: { createdAt: 'DESC' },
      }),
    ]);

    const teamMembers = allUsers
      .filter((user) => ['voluntario', 'admin'].includes(user.rol))
      .filter((user) => isGlobal || normalizeSeasonIds(user.temporadas).includes(normalizedSeasonID))
      .map((user) => ({ ID: user.ID, nombre: user.nombre, apellido: user.apellido, rol: user.rol }));

    res.json({
      fecha: date,
      seasonID: isGlobal ? null : normalizedSeasonID,
      global: isGlobal,
      members: teamMembers,
      attendances: attendances.map(serializeAttendance),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el resumen de asistencia del equipo', error: error.message });
  }
}

module.exports = { registerFromQR, getByDate, getMine, getDashboard };

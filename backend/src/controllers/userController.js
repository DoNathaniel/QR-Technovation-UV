'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppDataSource } = require('../database/data-source');
const UserSchema = require('../entities/User');
const SeasonSchema = require('../entities/Season');
const {
  normalizeSeasonIds,
  normalizeUserSeasons,
} = require('../utils/seasonAccess');
const { protect, reveal, serializeSensitive } = require('../services/sensitiveDataService');
const { generateMentorQR } = require('../services/qrService');
const { buildMentorQREmail } = require('../services/emailService');
const { enqueueEmail } = require('../services/emailQueueService');

const userRepository = () => AppDataSource.getRepository(UserSchema);
const seasonRepository = () => AppDataSource.getRepository(SeasonSchema);

function serializeUser(user) {
  return serializeSensitive(user, ['email']);
}

function userEmailValues(email) {
  const protectedEmail = protect(email, 'email');
  return { email: null, emailEncrypted: protectedEmail.encrypted, emailHash: protectedEmail.hash };
}

async function getAll(req, res) {
  try {
    const { rol, seasonID } = req.query;
    const findOptions = {
      select: ['ID', 'nombre', 'apellido', 'email', 'emailEncrypted', 'emailHash', 'rol', 'temporadas', 'qrUrl'],
    };

    if (rol) {
      findOptions.where = { rol };
    }

    const users = await userRepository().find(findOptions);
    const normalizedSeasonID = Number(seasonID);

    const seasonLookup = Number.isFinite(normalizedSeasonID)
      ? await seasonRepository().findOne({ where: { ID: normalizedSeasonID } })
      : null;

    const filteredUsers = Number.isFinite(normalizedSeasonID)
      ? users.filter((user) => {
          if (user.rol === 'superadmin') {
            return true;
          }

          const userSeasons = normalizeSeasonIds(user.temporadas);
          if (userSeasons.includes(normalizedSeasonID)) {
            return true;
          }

          return userSeasons.length === 0 && seasonLookup?.activa;
        })
      : users;

    res.json(filteredUsers.map((user) => normalizeUserSeasons(serializeUser(user))));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
}

async function create(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET || 'secret_key') : null;
    
    const { password, rol, temporadas, email, ...rest } = req.body;
    
    if (decoded?.rol !== 'superadmin' && rol === 'superadmin') {
      return res.status(403).json({ message: 'No tienes permiso para crear superadmin' });
    }
    
    if (decoded?.rol === 'admin' && rol === 'superadmin') {
      return res.status(403).json({ message: 'No tienes permiso para crear superadmin' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository().create({
      ...rest,
      ...userEmailValues(email),
      password: hashedPassword,
      rol: rol || 'voluntario',
      temporadas: normalizeSeasonIds(temporadas),
    });
    const result = await userRepository().save(user);
    delete result.password;
    res.status(201).json(normalizeUserSeasons(serializeUser(result)));
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const user = await userRepository().findOne({ where: { ID: parseInt(id) } });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET || 'secret_key') : null;
    
    const { password, rol, temporadas, email, ...rest } = req.body;
    
    if (rol && rol !== user.rol) {
      if (decoded?.rol !== 'superadmin') {
        return res.status(403).json({ message: 'No tienes permiso para cambiar el rol' });
      }
      if (decoded?.rol === 'admin' && rol === 'superadmin') {
        return res.status(403).json({ message: 'No puedes asignar rol superadmin' });
      }
      user.rol = rol;
    }
    
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (temporadas !== undefined) {
      user.temporadas = normalizeSeasonIds(temporadas);
    }
    Object.assign(user, rest);
    if (email !== undefined) Object.assign(user, userEmailValues(email));
    const result = await userRepository().save(user);
    delete result.password;
    res.json(normalizeUserSeasons(serializeUser(result)));
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await userRepository().delete(parseInt(id));
    res.json({ message: 'Usuario eliminado', result });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
}

async function getMentorOrRespond(id, res) {
  const user = await userRepository().findOne({ where: { ID: parseInt(id) } });
  if (!user) {
    res.status(404).json({ message: 'Usuario no encontrado' });
    return null;
  }
  if (!['voluntario', 'admin'].includes(user.rol)) {
    res.status(400).json({ message: 'Solo los usuarios con rol Voluntario o Admin pueden tener un QR de mentoría' });
    return null;
  }
  return user;
}

async function generateMentorQRForUser(req, res) {
  try {
    const user = await getMentorOrRespond(req.params.id, res);
    if (!user) return;

    const force = Boolean(req.body?.force);
    const email = reveal(user, 'email');
    if (!email) {
      return res.status(400).json({ message: 'El mentor no tiene un correo electrónico configurado' });
    }
    if (user.qrUrl && !force) {
      await enqueueEmail({
        recipientEmail: email,
        ...buildMentorQREmail(`${user.nombre} ${user.apellido}`, user.qrUrl),
        category: 'mentor_qr', relatedEntityType: 'User', relatedEntityID: user.ID,
      });
      return res.json({
        message: 'El mentor ya tiene un QR generado. El correo quedó en cola.',
        qrUrl: user.qrUrl,
        generated: false,
      });
    }

    user.qrUrl = await generateMentorQR(user.ID);
    await userRepository().save(user);
    await enqueueEmail({
      recipientEmail: email,
      ...buildMentorQREmail(`${user.nombre} ${user.apellido}`, user.qrUrl),
      category: 'mentor_qr', relatedEntityType: 'User', relatedEntityID: user.ID,
    });

    res.json({
      message: force ? 'QR de mentor regenerado y correo en cola.' : 'QR de mentor generado y correo en cola.',
      qrUrl: user.qrUrl,
      generated: true,
    });
  } catch (error) {
    console.error('[QR] Error al generar QR de mentor:', error.message);
    res.status(500).json({ message: 'Error al generar el QR de mentor', error: error.message });
  }
}

async function resendMentorQR(req, res) {
  try {
    const user = await getMentorOrRespond(req.params.id, res);
    if (!user) return;

    if (!user.qrUrl) {
      return res.status(409).json({ message: 'El mentor aún no tiene un QR generado. Usa Generar QR primero.' });
    }
    const email = reveal(user, 'email');
    if (!email) {
      return res.status(400).json({ message: 'El mentor no tiene un correo electrónico configurado' });
    }

    await enqueueEmail({
      recipientEmail: email,
      ...buildMentorQREmail(`${user.nombre} ${user.apellido}`, user.qrUrl),
      category: 'mentor_qr', relatedEntityType: 'User', relatedEntityID: user.ID,
    });
    res.json({ message: `QR dejado en cola para ${email}` });
  } catch (error) {
    console.error('[QR] Error al reenviar QR de mentor:', error.message);
    res.status(500).json({ message: 'Error al enviar el QR de mentor', error: error.message });
  }
}

async function getOwnQR(req, res) {
  try {
    const user = await userRepository().findOne({ where: { ID: req.user.id } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (!['voluntario', 'admin'].includes(user.rol)) {
      return res.status(403).json({ message: 'Tu usuario no tiene un QR de asistencia de equipo' });
    }
    if (!user.qrUrl) {
      return res.status(404).json({ message: 'Aún no tienes un QR generado. Solicítalo a un administrador.' });
    }
    res.json({ qrUrl: user.qrUrl });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener tu QR', error: error.message });
  }
}

module.exports = { getAll, create, update, remove, generateMentorQRForUser, resendMentorQR, getOwnQR };

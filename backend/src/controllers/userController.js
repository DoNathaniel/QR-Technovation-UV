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

const userRepository = () => AppDataSource.getRepository(UserSchema);
const seasonRepository = () => AppDataSource.getRepository(SeasonSchema);

async function getAll(req, res) {
  try {
    const { rol, seasonID } = req.query;
    const findOptions = {
      select: ['ID', 'nombre', 'apellido', 'email', 'rol', 'temporadas'],
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

    res.json(filteredUsers.map(normalizeUserSeasons));
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
}

async function create(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET || 'secret_key') : null;
    
    const { password, rol, temporadas, ...rest } = req.body;
    
    if (decoded?.rol !== 'superadmin' && rol === 'superadmin') {
      return res.status(403).json({ message: 'No tienes permiso para crear superadmin' });
    }
    
    if (decoded?.rol === 'admin' && rol === 'superadmin') {
      return res.status(403).json({ message: 'No tienes permiso para crear superadmin' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository().create({
      ...rest,
      password: hashedPassword,
      rol: rol || 'voluntario',
      temporadas: normalizeSeasonIds(temporadas),
    });
    const result = await userRepository().save(user);
    delete result.password;
    res.status(201).json(normalizeUserSeasons(result));
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
    
    const { password, rol, temporadas, ...rest } = req.body;
    
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
    const result = await userRepository().save(user);
    delete result.password;
    res.json(normalizeUserSeasons(result));
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

module.exports = { getAll, create, update, remove };

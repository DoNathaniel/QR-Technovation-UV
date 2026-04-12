'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppDataSource } = require('../database/data-source');
const UserSchema = require('../entities/User');

const userRepository = () => AppDataSource.getRepository(UserSchema);

async function getAll(req, res) {
  try {
    const users = await userRepository().find({
      select: ['ID', 'nombre', 'apellido', 'email', 'rol', 'temporadas'],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
}

async function create(req, res) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');
    const decoded = token ? jwt.verify(token, process.env.JWT_SECRET || 'secret_key') : null;
    
    const { password, rol, ...rest } = req.body;
    
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
    });
    const result = await userRepository().save(user);
    delete result.password;
    res.status(201).json(result);
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
    
    const { password, rol, ...rest } = req.body;
    
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
    Object.assign(user, rest);
    const result = await userRepository().save(user);
    delete result.password;
    res.json(result);
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
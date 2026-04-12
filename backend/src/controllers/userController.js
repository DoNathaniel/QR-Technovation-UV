'use strict';
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
    const user = userRepository().create(req.body);
    const result = await userRepository().save(user);
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
    Object.assign(user, req.body);
    const result = await userRepository().save(user);
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
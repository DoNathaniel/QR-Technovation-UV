'use strict';
const express = require('express');
const { AppDataSource } = require('../database/data-source');
const UserSchema = require('../entities/User');

const router = express.Router();
const userRepository = () => AppDataSource.getRepository(UserSchema);

router.get('/', async (req, res) => {
  try {
    const users = await userRepository().find({
      select: ['id', 'nombre', 'apellido', 'email', 'rol', 'temporadas'],
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

module.exports = router;
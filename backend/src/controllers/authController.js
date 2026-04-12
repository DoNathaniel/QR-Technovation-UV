'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AppDataSource } = require('../database/data-source');
const UserSchema = require('../entities/User');
const SeasonSchema = require('../entities/Season');

const userRepository = () => AppDataSource.getRepository(UserSchema);
const seasonRepository = () => AppDataSource.getRepository(SeasonSchema);

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const user = await userRepository().findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const userTemporadas = user.temporadas 
      ? user.temporadas.map(Number).filter(Boolean)
      : [];

    const token = jwt.sign(
      { 
        id: user.ID, 
        email: user.email, 
        rol: user.rol, 
        temporadas: userTemporadas 
      },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '24h' }
    );

    let temporadas = [];
    if (userTemporadas.length > 0) {
      temporadas = await seasonRepository().findByIds(userTemporadas);
    } else {
      temporadas = await seasonRepository().find({ where: { activa: true } });
    }

    res.json({
      user: {
        ID: user.ID,
        nombre: user.nombre,
        apellido: user.apellido,
        email: user.email,
        rol: user.rol,
        temporadas: userTemporadas,
      },
      token,
      temporadas,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

module.exports = { login };
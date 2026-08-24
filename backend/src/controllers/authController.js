'use strict';
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { AppDataSource } = require('../database/data-source');
const UserSchema = require('../entities/User');
const SeasonSchema = require('../entities/Season');
const {
  normalizeSeasonIds,
  normalizeUserSeasons,
} = require('../utils/seasonAccess');
const { blindIndex, reveal } = require('../services/sensitiveDataService');

const userRepository = () => AppDataSource.getRepository(UserSchema);
const seasonRepository = () => AppDataSource.getRepository(SeasonSchema);
const googleClient = () => new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl()
);

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    // localhost OAuth uses HTTP; deployed frontends must use HTTPS.
    secure: frontendUrl().startsWith('https://'),
    path: '/',
  };
}

function readCookie(req, name) {
  const cookies = req.headers.cookie || '';
  const prefix = `${name}=`;
  const value = cookies.split(';').map((item) => item.trim()).find((item) => item.startsWith(prefix));
  return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function frontendUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

function googleCallbackUrl() {
  return process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';
}

function googleIsConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

async function createLoginResponse(user) {
  const userTemporadas = normalizeSeasonIds(user.temporadas);
  const token = jwt.sign(
    {
      id: user.ID,
      rol: user.rol,
      temporadas: userTemporadas,
    },
    process.env.JWT_SECRET || 'secret_key',
    { expiresIn: '24h' }
  );

  let temporadas = [];
  if (user.rol === 'superadmin') {
    temporadas = await seasonRepository().find();
  } else if (userTemporadas.length > 0) {
    temporadas = await seasonRepository().findByIds(userTemporadas);
  } else {
    temporadas = await seasonRepository().find({ where: { activa: true } });
  }

  return {
    user: normalizeUserSeasons({
      ID: user.ID,
      nombre: user.nombre,
      apellido: user.apellido,
      email: reveal(user, 'email'),
      rol: user.rol,
      temporadas: userTemporadas,
    }),
    token,
    temporadas,
  };
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son requeridos' });
    }

    const user = await userRepository().findOne({
      where: [{ emailHash: blindIndex(email, 'email') }, { email }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    res.json(await createLoginResponse(user));
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
}

function startGoogleLogin(req, res) {
  if (!googleIsConfigured()) {
    return res.status(503).json({ message: 'Google OAuth no está configurado en el servidor' });
  }

  const state = crypto.randomBytes(32).toString('base64url');
  res.cookie('google_oauth_state', state, { ...cookieOptions(), maxAge: 10 * 60 * 1000 });

  const authorizationUrl = googleClient().generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
    redirect_uri: googleCallbackUrl(),
    state,
  });

  return res.redirect(authorizationUrl);
}

function redirectAfterGoogleLogin(res, params) {
  const query = new URLSearchParams(params);
  return res.redirect(`${frontendUrl()}/iniciar-sesion?${query.toString()}`);
}

async function googleCallback(req, res) {
  const stateCookie = readCookie(req, 'google_oauth_state');
  res.clearCookie('google_oauth_state', cookieOptions());
  if (req.query.error || !req.query.code || !req.query.state || req.query.state !== stateCookie) {
    return redirectAfterGoogleLogin(res, { oauth_error: 'google_cancelled' });
  }

  try {
    const { tokens } = await googleClient().getToken({
      code: req.query.code,
      redirect_uri: googleCallbackUrl(),
    });
    if (!tokens.id_token) throw new Error('Google no devolvió un ID token');

    const ticket = await googleClient().verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const profile = ticket.getPayload();
    const email = profile?.email?.trim().toLowerCase();

    if (!email || profile.email_verified !== true) {
      return redirectAfterGoogleLogin(res, { oauth_error: 'google_email_not_verified' });
    }

    const user = await userRepository().findOne({
      where: [{ emailHash: blindIndex(email, 'email') }, { email }],
    });
    if (!user) {
      return redirectAfterGoogleLogin(res, { oauth_error: 'google_not_authorized' });
    }

    const loginResponse = await createLoginResponse(user);
    res.cookie('google_oauth_login', loginResponse.token, { ...cookieOptions(), maxAge: 60 * 1000 });
    return redirectAfterGoogleLogin(res, { google: 'success' });
  } catch (error) {
    console.error('Google OAuth error:', error);
    return redirectAfterGoogleLogin(res, { oauth_error: 'google_failed' });
  }
}

async function googleSession(req, res) {
  const token = readCookie(req, 'google_oauth_login');
  res.clearCookie('google_oauth_login', cookieOptions());
  if (!token) return res.status(401).json({ message: 'La sesión de Google expiró. Intenta nuevamente.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
    const user = await userRepository().findOneBy({ ID: decoded.id });
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado' });
    return res.json(await createLoginResponse(user));
  } catch (error) {
    return res.status(401).json({ message: 'La sesión de Google no es válida' });
  }
}

module.exports = {
  login,
  startGoogleLogin,
  googleCallback,
  googleSession,
};

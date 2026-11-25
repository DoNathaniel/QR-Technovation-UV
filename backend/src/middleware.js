const jwt = require('jsonwebtoken');
const { isMaintenanceEnabled } = require('./services/maintenanceService');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    // An invalid or expired token means the user is unauthenticated. The
    // frontend handles 401 by clearing the stale session and returning to login.
    // Keep 403 for authenticated users who lack permission in checkRole.
    if (err) return res.status(401).json({ message: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      return res.status(403).json({ message: 'Sin permiso suficiente' });
    }
    next();
  };
}

function maintenanceGate(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', async (err, user) => {
    if (err || ['admin', 'superadmin'].includes(user?.rol)) return next();
    try {
      if (await isMaintenanceEnabled()) {
        return res.status(503).json({ message: 'Actualmente la página se encuentra en mantenimiento para futuras temporadas.' });
      }
      next();
    } catch (error) {
      next(error);
    }
  });
}

module.exports = { authenticateToken, checkRole, maintenanceGate };

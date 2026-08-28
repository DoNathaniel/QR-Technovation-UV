'use strict';

const { getUnsubscribeStatus, unsubscribeByToken } = require('../services/notificationPreferenceService');

function invalidTokenResponse(res, error) {
  const isExpired = error?.name === 'TokenExpiredError';
  return res.status(400).json({
    message: isExpired
      ? 'Este enlace de desuscripción venció. Puedes usar el enlace de un correo más reciente.'
      : 'Este enlace de desuscripción no es válido.',
  });
}

async function getUnsubscribePageStatus(req, res) {
  try {
    const status = await getUnsubscribeStatus(req.query.token);
    res.json({ valid: true, alreadyUnsubscribed: status.isUnsubscribed });
  } catch (error) {
    invalidTokenResponse(res, error);
  }
}

async function confirmUnsubscribe(req, res) {
  try {
    const result = await unsubscribeByToken(req.body?.token);
    res.json({ success: true, alreadyUnsubscribed: result.alreadyUnsubscribed });
  } catch (error) {
    invalidTokenResponse(res, error);
  }
}

module.exports = { getUnsubscribePageStatus, confirmUnsubscribe };

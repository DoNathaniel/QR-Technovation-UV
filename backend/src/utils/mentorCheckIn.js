"use strict";

function readGeofence(env = process.env) {
  const values = [env.MENTOR_CHECKIN_LATITUDE, env.MENTOR_CHECKIN_LONGITUDE, env.MENTOR_CHECKIN_RADIUS_METERS, env.MENTOR_CHECKIN_MAX_ACCURACY_METERS];
  if (values.some(v => typeof v !== 'string' || !v.trim())) return null;
  const [latitude, longitude, radius, maxAccuracy] = values.map(Number);
  if (![latitude, longitude, radius, maxAccuracy].every(Number.isFinite) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || radius <= 0 || maxAccuracy <= 0) return null;
  return { latitude, longitude, radius, maxAccuracy };
}

function validatePosition(position, fence, now = Date.now()) {
  const fail = message => ({ ok: false, message });
  if (!fence) return fail('El registro por ubicación aún no está configurado. Usa tu QR.');
  const { latitude, longitude, accuracy, timestamp } = position || {};
  if (![latitude, longitude, accuracy, timestamp].every(v => typeof v === 'number' && Number.isFinite(v)) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || accuracy <= 0) return fail('La ubicación recibida no es válida.');
  if (now - timestamp > 60000 || timestamp - now > 10000) return fail('La ubicación expiró. Intenta nuevamente.');
  if (accuracy > fence.maxAccuracy) return fail('La ubicación es demasiado imprecisa. Activa la ubicación precisa y vuelve a intentar.');
  const radians = degrees => degrees * Math.PI / 180;
  const a = Math.sin(radians(latitude - fence.latitude) / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(fence.latitude)) * Math.sin(radians(longitude - fence.longitude) / 2) ** 2;
  const distance = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  // Exigir que el margen de incertidumbre también esté dentro del área.
  if (distance + accuracy > fence.radius) return fail('Estás fuera del área permitida o demasiado cerca de su límite. Acércate a la sede y vuelve a intentar.');
  return { ok: true, distance };
}

module.exports = { readGeofence, validatePosition };

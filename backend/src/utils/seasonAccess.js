'use strict';

function normalizeSeasonIds(value) {
  if (!value) return [];

  const rawValues = Array.isArray(value)
    ? value
    : String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

  return rawValues
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry));
}

function normalizeUserSeasons(user) {
  if (!user) return user;

  return {
    ...user,
    temporadas: normalizeSeasonIds(user.temporadas),
  };
}

function userHasSeasonAccess(user, seasonID, activeSeasonIds = []) {
  if (!user) return false;
  if (user.rol === 'superadmin') return true;

  const normalizedSeasonID = Number(seasonID);
  if (!Number.isFinite(normalizedSeasonID)) return false;

  const userSeasons = normalizeSeasonIds(user.temporadas);
  if (userSeasons.includes(normalizedSeasonID)) {
    return true;
  }

  if (userSeasons.length === 0) {
    return normalizeSeasonIds(activeSeasonIds).includes(normalizedSeasonID);
  }

  return false;
}

module.exports = {
  normalizeSeasonIds,
  normalizeUserSeasons,
  userHasSeasonAccess,
};

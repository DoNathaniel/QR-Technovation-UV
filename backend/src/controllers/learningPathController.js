'use strict';
const { AppDataSource } = require('../database/data-source');
const SeasonSchema = require('../entities/Season');
const { listLearningPaths, readLearningPath } = require('../utils/learningPathCatalog');
const { userHasSeasonAccess } = require('../utils/seasonAccess');

async function list(req, res) {
  res.json(listLearningPaths());
}

async function getForSeason(req, res) {
  const seasonID = Number(req.params.seasonID);
  if (!Number.isInteger(seasonID) || seasonID < 1) return res.status(400).json({ message: 'Temporada inválida.' });
  const season = await AppDataSource.getRepository(SeasonSchema).findOne({ where: { ID: seasonID } });
  if (!season) return res.status(404).json({ message: 'Temporada no encontrada.' });
  if (!userHasSeasonAccess(req.user, seasonID)) return res.status(403).json({ message: 'No tienes acceso a esta temporada.' });
  if (!season.learningPathFile) return res.json({ path: null, unavailable: false });
  const pathData = readLearningPath(season.learningPathFile);
  if (!pathData) return res.json({ path: null, unavailable: true, filename: season.learningPathFile });
  return res.json({ path: pathData, unavailable: false, filename: season.learningPathFile });
}

module.exports = { list, getForSeason };

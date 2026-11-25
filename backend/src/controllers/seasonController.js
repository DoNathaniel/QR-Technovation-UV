'use strict';
const { AppDataSource } = require('../database/data-source');
const SeasonSchema = require('../entities/Season');
const { normalizeSeasonIds } = require('../utils/seasonAccess');
const { isCompatibleLearningPath } = require('../utils/learningPathCatalog');

const seasonRepository = () => AppDataSource.getRepository(SeasonSchema);

async function getAll(req, res) {
  try {
    const assignedSeasonIds = normalizeSeasonIds(req.user?.temporadas);
    const seasons = req.user?.rol === 'superadmin'
      ? await seasonRepository().find()
      : assignedSeasonIds.length > 0 ? await seasonRepository().findByIds(assignedSeasonIds) : [];
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener temporadas', error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const season = await seasonRepository().findOne({ where: { ID: parseInt(id) } });
    if (!season) {
      return res.status(404).json({ message: 'Temporada no encontrada' });
    }
    res.json(season);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener temporada', error: error.message });
  }
}

async function create(req, res) {
  try {
    const data = { ...req.body };
    if (data.learningPathFile && !isCompatibleLearningPath(data.learningPathFile)) {
      return res.status(400).json({ message: 'La ruta de aprendizaje seleccionada no está disponible o no es compatible.' });
    }
    const season = seasonRepository().create(data);
    const result = await seasonRepository().save(season);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear temporada', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const season = await seasonRepository().findOne({ where: { ID: parseInt(id) } });
    if (!season) {
      return res.status(404).json({ message: 'Temporada no encontrada' });
    }
    const data = { ...req.body };
    if (Object.hasOwn(data, 'learningPathFile') && data.learningPathFile && !isCompatibleLearningPath(data.learningPathFile)) {
      return res.status(400).json({ message: 'La ruta de aprendizaje seleccionada no está disponible o no es compatible.' });
    }
    Object.assign(season, data);
    const result = await seasonRepository().save(season);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar temporada', error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await seasonRepository().delete(parseInt(id));
    res.json({ message: 'Temporada eliminada', result });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar temporada', error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove };

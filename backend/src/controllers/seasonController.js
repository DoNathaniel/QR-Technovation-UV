'use strict';
const { AppDataSource } = require('../database/data-source');
const SeasonSchema = require('../entities/Season');

const seasonRepository = () => AppDataSource.getRepository(SeasonSchema);

async function getAll(req, res) {
  try {
    const seasons = await seasonRepository().find({ where: { activa: true } });
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
    const season = seasonRepository().create(req.body);
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
    Object.assign(season, req.body);
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
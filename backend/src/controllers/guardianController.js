'use strict';
const { AppDataSource } = require('../database/data-source');
const GuardianSchema = require('../entities/Guardian');

const guardianRepository = () => AppDataSource.getRepository(GuardianSchema);

async function getAll(req, res) {
  try {
    const seasonID = req.query.seasonID;
    const where = seasonID ? { seasonID: parseInt(seasonID) } : {};
    const guardians = await guardianRepository().find({ where });
    res.json(guardians);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener apoderados', error: error.message });
  }
}

async function getById(req, res) {
  try {
    const { id } = req.params;
    const guardian = await guardianRepository().findOne({ 
      where: { ID: parseInt(id) },
      relations: ['estudiantes']
    });
    if (!guardian) {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }
    res.json(guardian);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener apoderado', error: error.message });
  }
}

async function create(req, res) {
  try {
    const guardian = guardianRepository().create(req.body);
    const result = await guardianRepository().save(guardian);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear apoderado', error: error.message });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const guardian = await guardianRepository().findOne({ where: { ID: parseInt(id) } });
    if (!guardian) {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }
    Object.assign(guardian, req.body);
    const result = await guardianRepository().save(guardian);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar apoderado', error: error.message });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const result = await guardianRepository().delete(parseInt(id));
    res.json({ message: 'Apoderado eliminado', result });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar apoderado', error: error.message });
  }
}

module.exports = { getAll, getById, create, update, remove };
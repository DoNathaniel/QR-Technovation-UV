'use strict';
const express = require('express');
const { AppDataSource } = require('../database/data-source');
const GuardianSchema = require('../entities/Guardian');

const router = express.Router();
const guardianRepository = () => AppDataSource.getRepository(GuardianSchema);

router.get('/', async (req, res) => {
  try {
    const seasonId = req.query.seasonId;
    const where = seasonId ? { seasonId: Number(seasonId) } : {};
    const guardians = await guardianRepository().find({ where });
    res.json(guardians);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener apoderados' });
  }
});

module.exports = router;
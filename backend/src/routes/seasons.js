'use strict';
const express = require('express');
const { AppDataSource } = require('../database/data-source');
const SeasonSchema = require('../entities/Season');

const router = express.Router();
const seasonRepository = () => AppDataSource.getRepository(SeasonSchema);

router.get('/', async (req, res) => {
  try {
    const seasons = await seasonRepository().find({ where: { activa: true } });
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener temporadas' });
  }
});

router.post('/', async (req, res) => {
  try {
    const season = seasonRepository().create(req.body);
    const result = await seasonRepository().save(season);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear temporada' });
  }
});

module.exports = router;
'use strict';
const express = require('express');
const { AppDataSource } = require('../database/data-source');
const SeasonDateSchema = require('../entities/SeasonDate');

const router = express.Router();
const seasonDateRepository = () => AppDataSource.getRepository(SeasonDateSchema);

router.get('/:seasonID/dates', async (req, res) => {
  try {
    const { seasonID } = req.params;
    const dates = await seasonDateRepository().find({ where: { seasonID: parseInt(seasonID) } });
    res.json(dates);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener fechas', error: error.message });
  }
});

router.post('/:seasonID/dates', async (req, res) => {
  try {
    const { seasonID } = req.params;
    const { fecha } = req.body;
    const date = seasonDateRepository().create({ fecha, seasonID: parseInt(seasonID) });
    const result = await seasonDateRepository().save(date);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear fecha', error: error.message });
  }
});

router.post('/:seasonID/dates/bulk', async (req, res) => {
  try {
    const { seasonID } = req.params;
    const { fechaInicio, fechaFin } = req.body;
    
    const start = new Date(fechaInicio);
    const end = new Date(fechaFin);
    const dates = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push({
        fecha: d.toISOString().split('T')[0],
        seasonID: parseInt(seasonID),
        activa: true
      });
    }
    
    for (const date of dates) {
      const existing = await seasonDateRepository().findOne({ 
        where: { fecha: date.fecha, seasonID: date.seasonID } 
      });
      if (!existing) {
        const newDate = seasonDateRepository().create(date);
        await seasonDateRepository().save(newDate);
      }
    }
    
    res.json({ message: 'Fechas importadas correctamente', count: dates.length });
  } catch (error) {
    res.status(500).json({ message: 'Error al importar fechas', error: error.message });
  }
});

router.delete('/:seasonID/dates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await seasonDateRepository().delete(parseInt(id));
    res.json({ message: 'Fecha eliminada', result });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar fecha', error: error.message });
  }
});

module.exports = router;
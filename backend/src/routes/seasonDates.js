'use strict';
const express = require('express');
const { AppDataSource } = require('../database/data-source');
const SeasonDateSchema = require('../entities/SeasonDate');
const { MAX_CHECKLIST_SECTION } = require('../services/teamChecklistService');
const { authenticateToken, checkRole } = require('../middleware');

const router = express.Router();
const seasonDateRepository = () => AppDataSource.getRepository(SeasonDateSchema);

router.get('/:seasonID/dates', authenticateToken, async (req, res) => {
  try {
    const { seasonID } = req.params;
    const dates = await seasonDateRepository().find({ where: { seasonID: parseInt(seasonID) } });
    res.json(dates);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener fechas', error: error.message });
  }
});

router.post('/:seasonID/dates', authenticateToken, checkRole('superadmin'), async (req, res) => {
  try {
    const { seasonID } = req.params;
    const { fecha, checklistPoint = null } = req.body;
    if (checklistPoint !== null && (!Number.isInteger(Number(checklistPoint)) || Number(checklistPoint) < 0 || Number(checklistPoint) > MAX_CHECKLIST_SECTION)) {
      return res.status(400).json({ message: `El punto del checklist debe estar entre 0 y ${MAX_CHECKLIST_SECTION}.` });
    }
    const date = seasonDateRepository().create({ fecha, seasonID: parseInt(seasonID), checklistPoint: checklistPoint === null ? null : Number(checklistPoint) });
    const result = await seasonDateRepository().save(date);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear fecha', error: error.message });
  }
});

router.put('/:seasonID/dates/:id', authenticateToken, checkRole('superadmin'), async (req, res) => {
  const seasonID = Number(req.params.seasonID);
  const ID = Number(req.params.id);
  const rawPoint = req.body?.checklistPoint;
  const checklistPoint = rawPoint === null || rawPoint === '' ? null : Number(rawPoint);
  if (rawPoint !== null && rawPoint !== '' && (!Number.isInteger(checklistPoint) || checklistPoint < 0 || checklistPoint > MAX_CHECKLIST_SECTION)) {
    return res.status(400).json({ message: `El punto del checklist debe estar entre 0 y ${MAX_CHECKLIST_SECTION}.` });
  }
  try {
    const date = await seasonDateRepository().findOne({ where: { ID, seasonID } });
    if (!date) return res.status(404).json({ message: 'No se encontró la fecha de esta temporada.' });
    date.checklistPoint = checklistPoint;
    await seasonDateRepository().save(date);
    return res.json(date);
  } catch {
    return res.status(500).json({ message: 'No se pudo actualizar el punto del checklist.' });
  }
});

router.post('/:seasonID/dates/bulk', authenticateToken, checkRole('superadmin'), async (req, res) => {
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

'use strict';
const { AppDataSource } = require('../database/data-source');
const MaintenanceStateSchema = require('../entities/MaintenanceState');
const { setMaintenanceEnabled } = require('../services/maintenanceService');

async function getStatus(req, res) {
  try {
    const state = await AppDataSource.getRepository(MaintenanceStateSchema).findOne({ where: { ID: 1 } });
    res.json({ enabled: Boolean(state?.enabled), updatedAt: state?.updatedAt ?? null });
  } catch (error) {
    res.status(500).json({ message: 'No fue posible consultar el modo de mantenimiento.' });
  }
}

async function updateStatus(req, res) {
  const { enabled } = req.body || {};
  if (typeof enabled !== 'boolean') return res.status(400).json({ message: 'Indica si el mantenimiento debe estar activado.' });
  try {
    const state = await setMaintenanceEnabled(enabled, req.user.id);
    res.json({ enabled: state.enabled, updatedAt: state.updatedAt });
  } catch (error) {
    res.status(500).json({ message: 'No fue posible actualizar el modo de mantenimiento.' });
  }
}

module.exports = { getStatus, updateStatus };

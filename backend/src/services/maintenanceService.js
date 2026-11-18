'use strict';
const { AppDataSource } = require('../database/data-source');
const MaintenanceStateSchema = require('../entities/MaintenanceState');

async function isMaintenanceEnabled() {
  const state = await AppDataSource.getRepository(MaintenanceStateSchema).findOne({ where: { ID: 1 } });
  return Boolean(state?.enabled);
}

async function setMaintenanceEnabled(enabled, userID) {
  const repository = AppDataSource.getRepository(MaintenanceStateSchema);
  const state = repository.create({ ID: 1, enabled, updatedByUserID: userID });
  return repository.save(state);
}

module.exports = { isMaintenanceEnabled, setMaintenanceEnabled };

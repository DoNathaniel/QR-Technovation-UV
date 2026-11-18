'use strict';
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'MaintenanceState',
  tableName: 'maintenance_state',
  columns: {
    ID: { type: 'int', primary: true },
    enabled: { type: 'boolean', default: false },
    updatedByUserID: { type: 'int', nullable: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
});

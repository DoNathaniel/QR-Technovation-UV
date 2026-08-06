'use strict';
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'SensitiveDataMigrationLog',
  tableName: 'sensitive_data_migration_logs',
  columns: {
    ID: { type: 'int', primary: true, generated: true },
    userID: { type: 'int' },
    dryRun: { type: 'boolean', default: false },
    processed: { type: 'int', default: 0 },
    failed: { type: 'int', default: 0 },
    details: { type: 'json', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
  },
});

'use strict';
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'TeamChecklistRunItem',
  tableName: 'team_checklist_run_items',
  columns: {
    ID: { type: 'int', primary: true, generated: true },
    runID: { type: 'int' },
    teamID: { type: 'int' },
    teamName: { type: 'varchar', length: 100 },
    status: { type: 'enum', enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued' },
    attempts: { type: 'int', default: 0 },
    maxAttempts: { type: 'int', default: 3 },
    lastError: { type: 'varchar', length: 500, nullable: true },
    changes: { type: 'json', nullable: true },
    completedAt: { type: 'timestamp', nullable: true },
  },
  indices: [
    { name: 'UQ_team_checklist_run_team', columns: ['runID', 'teamID'], unique: true },
    { name: 'IDX_team_checklist_run_item_queue', columns: ['runID', 'status'] },
  ],
});

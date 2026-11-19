'use strict';
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'TeamChecklistRun',
  tableName: 'team_checklist_runs',
  columns: {
    ID: { type: 'int', primary: true, generated: true },
    runKey: { type: 'varchar', length: 180, unique: true },
    activeKey: { type: 'varchar', length: 100, nullable: true, unique: true },
    seasonID: { type: 'int' },
    seasonDateID: { type: 'int', nullable: true },
    targetDate: { type: 'date', nullable: true },
    mode: { type: 'enum', enum: ['manual', 'automatic'], default: 'manual' },
    sendMentorEmails: { type: 'boolean', default: false },
    notificationsQueued: { type: 'boolean', default: false },
    status: { type: 'enum', enum: ['queued', 'running', 'completed', 'completed_with_errors'], default: 'queued' },
    total: { type: 'int', default: 0 },
    completed: { type: 'int', default: 0 },
    failed: { type: 'int', default: 0 },
    currentTeamName: { type: 'varchar', length: 100, nullable: true },
    startedAt: { type: 'timestamp', nullable: true },
    finishedAt: { type: 'timestamp', nullable: true },
    createdAt: { type: 'timestamp', createDate: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  indices: [{ name: 'IDX_team_checklist_runs_season_status', columns: ['seasonID', 'status'] }],
});

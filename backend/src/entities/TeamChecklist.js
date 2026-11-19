'use strict';
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'TeamChecklist',
  tableName: 'team_checklists',
  columns: {
    ID: { type: 'int', primary: true, generated: true },
    teamID: { type: 'int', unique: true },
    fileUrl: { type: 'varchar', length: 1000, nullable: true },
    status: { type: 'enum', enum: ['not_reviewed', 'reviewed', 'error', 'unlinked'], default: 'not_reviewed' },
    items: { type: 'json', nullable: true },
    completedCount: { type: 'int', default: 0 },
    applicableCount: { type: 'int', default: 0 },
    percent: { type: 'int', default: 0 },
    lastAttemptAt: { type: 'timestamp', nullable: true },
    lastSuccessfulReviewAt: { type: 'timestamp', nullable: true },
    lastError: { type: 'varchar', length: 500, nullable: true },
    updatedAt: { type: 'timestamp', updateDate: true },
  },
  relations: {
    team: {
      type: 'one-to-one',
      target: 'Team',
      joinColumn: { name: 'teamID' },
      onDelete: 'CASCADE',
    },
  },
});

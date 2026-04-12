'use strict';
const { EntitySchema } = require('typeorm');

const SeasonDateSchema = new EntitySchema({
  name: 'SeasonDate',
  tableName: 'season_dates',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true,
    },
    fecha: {
      type: 'date',
    },
    activa: {
      type: 'boolean',
      default: true,
    },
    seasonId: {
      type: 'int',
    },
  },
  relations: {
    season: {
      type: 'many-to-one',
      target: 'Season',
      joinColumn: { name: 'seasonId' },
      onDelete: 'CASCADE',
    },
  },
});

module.exports = SeasonDateSchema;
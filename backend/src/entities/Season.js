'use strict';
const { EntitySchema } = require('typeorm');

const SeasonSchema = new EntitySchema({
  name: 'Season',
  tableName: 'seasons',
  columns: {
    ID: {
      type: 'int',
      primary: true,
      generated: true,
    },
    nombre: {
      type: 'varchar',
      length: 255,
    },
    fechaInicio: {
      type: 'date',
    },
    fechaFin: {
      type: 'date',
    },
    activa: {
      type: 'boolean',
      default: true,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true,
    },
  },
  relations: {
    fechas: {
      type: 'one-to-many',
      target: 'SeasonDate',
      inverseSide: 'season',
    },
  },
});

module.exports = SeasonSchema;
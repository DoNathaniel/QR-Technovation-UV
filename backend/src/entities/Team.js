'use strict';
const { EntitySchema } = require('typeorm');

// Puede crear tabla ODS/category si es necesario,
// por ahora ambos se modelan como enum para simplicidad

const TeamSchema = new EntitySchema({
  name: 'Team',
  tableName: 'teams',
  columns: {
    ID: {
      type: 'int',
      primary: true,
      generated: true,
    },
    nombre: {
      type: 'varchar',
      length: 100,
    },
    numeroCorrelativo: {
      type: 'int',
    },
    seasonID: {
      type: 'int',
    },
    ods: {
      type: 'enum',
      enum: [
        'ODS1','ODS2','ODS3','ODS4','ODS5','ODS6','ODS7','ODS8','ODS9','ODS10','ODS11','ODS12','ODS13','ODS14','ODS15','ODS16','ODS17'
      ],
    },
    categoria: {
      type: 'enum',
      enum: ['Beginner', 'Junior', 'Senior'],
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
    season: {
      type: 'many-to-one',
      target: 'Season',
      joinColumn: { name: 'seasonID' },
      onDelete: 'CASCADE',
    },
    teamStudents: {
      type: 'one-to-many',
      target: 'TeamStudent',
      inverseSide: 'team',
    },
    teamMentors: {
      type: 'one-to-many',
      target: 'TeamMentor',
      inverseSide: 'team',
    },
  },
});

module.exports = TeamSchema;

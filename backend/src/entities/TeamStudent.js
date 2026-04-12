'use strict';
const { EntitySchema } = require('typeorm');

const TeamStudentSchema = new EntitySchema({
  name: 'TeamStudent',
  tableName: 'team_students',
  columns: {
    ID: {
      type: 'int',
      primary: true,
      generated: true,
    },
    teamID: {
      type: 'int',
    },
    studentID: {
      type: 'int',
    },
    seasonID: { // redundancia útil para consultas rápidas
      type: 'int',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    team: {
      type: 'many-to-one',
      target: 'Team',
      joinColumn: { name: 'teamID' },
      onDelete: 'CASCADE',
    },
    student: {
      type: 'many-to-one',
      target: 'Student',
      joinColumn: { name: 'studentID' },
      onDelete: 'CASCADE',
    },
  },
  uniques: [
    {
      name: 'UQ_team_student',
      columns: ['studentID', 'seasonID'], // ÚNICO: una niña, una temporada
    },
  ],
});

module.exports = TeamStudentSchema;

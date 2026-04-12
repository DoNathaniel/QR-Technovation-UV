'use strict';
const { EntitySchema } = require('typeorm');

const TeamMentorSchema = new EntitySchema({
  name: 'TeamMentor',
  tableName: 'team_mentors',
  columns: {
    ID: {
      type: 'int',
      primary: true,
      generated: true,
    },
    teamID: {
      type: 'int',
    },
    mentorID: {
      type: 'int',
    },
    seasonID: {
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
    mentor: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'mentorID' },
      onDelete: 'CASCADE',
    },
  },
});

module.exports = TeamMentorSchema;

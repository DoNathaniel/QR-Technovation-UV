'use strict';
const { EntitySchema } = require('typeorm');

const AttendanceSchema = new EntitySchema({
  name: 'Attendance',
  tableName: 'attendance',
  columns: {
    ID: {
      type: 'int',
      primary: true,
      generated: true,
    },
    tipo: {
      type: 'enum',
      enum: ['entrada', 'salida', 'justificado'],
    },
    hora: {
      type: 'time',
    },
    studentID: {
      type: 'int',
    },
    seasonDateID: {
      type: 'int',
    },
    userID: {
      type: 'int',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
    justificacion: {
      type: 'varchar',
      length: 500,
      nullable: true,
    },
  },
  relations: {
    student: {
      type: 'many-to-one',
      target: 'Student',
      joinColumn: { name: 'studentID' },
      onDelete: 'CASCADE',
    },
    seasonDate: {
      type: 'many-to-one',
      target: 'SeasonDate',
      joinColumn: { name: 'seasonDateID' },
    },
  },
});

module.exports = AttendanceSchema;
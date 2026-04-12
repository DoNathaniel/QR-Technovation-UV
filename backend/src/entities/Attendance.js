'use strict';
const { EntitySchema } = require('typeorm');

const AttendanceSchema = new EntitySchema({
  name: 'Attendance',
  tableName: 'attendance',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true,
    },
    tipo: {
      type: 'enum',
      enum: ['entrada', 'salida'],
    },
    hora: {
      type: 'time',
    },
    studentId: {
      type: 'int',
    },
    seasonDateId: {
      type: 'int',
    },
    userId: {
      type: 'int',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    student: {
      type: 'many-to-one',
      target: 'Student',
      joinColumn: { name: 'studentId' },
      onDelete: 'CASCADE',
    },
    seasonDate: {
      type: 'many-to-one',
      target: 'SeasonDate',
      joinColumn: { name: 'seasonDateId' },
    },
  },
});

module.exports = AttendanceSchema;
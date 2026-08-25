'use strict';
const { EntitySchema } = require('typeorm');

const MentorAttendanceSchema = new EntitySchema({
  name: 'MentorAttendance',
  tableName: 'mentor_attendance',
  columns: {
    ID: { type: 'int', primary: true, generated: true },
    tipo: { type: 'enum', enum: ['entrada', 'salida'] },
    fecha: { type: 'date' },
    hora: { type: 'time' },
    seasonID: { type: 'int' },
    seasonDateID: { type: 'int', nullable: true },
    esFechaPlanificada: { type: 'boolean', default: false },
    mentorID: { type: 'int' },
    scannedByUserID: { type: 'int' },
    emailSent: { type: 'boolean', default: false },
    createdAt: { type: 'timestamp', createDate: true },
  },
  relations: {
    mentor: {
      type: 'many-to-one', target: 'User', joinColumn: { name: 'mentorID' }, onDelete: 'CASCADE',
    },
    scannedBy: {
      type: 'many-to-one', target: 'User', joinColumn: { name: 'scannedByUserID' }, onDelete: 'RESTRICT',
    },
    seasonDate: {
      type: 'many-to-one', target: 'SeasonDate', joinColumn: { name: 'seasonDateID' }, onDelete: 'SET NULL', nullable: true,
    },
  },
});

module.exports = MentorAttendanceSchema;

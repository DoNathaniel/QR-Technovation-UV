'use strict';
const { EntitySchema } = require('typeorm');

const StudentSchema = new EntitySchema({
  name: 'Student',
  tableName: 'students',
  columns: {
    ID: {
      type: 'int',
      primary: true,
      generated: true,
    },
    nombres: {
      type: 'varchar',
      length: 100,
    },
    apellidos: {
      type: 'varchar',
      length: 100,
    },
    email: {
      type: 'varchar',
      length: 255,
      nullable: true,
    },
    fechaNac: {
      type: 'date',
      nullable: true,
    },
    rut: {
      type: 'varchar',
      length: 20,
    },
    categoria: {
      type: 'enum',
      enum: ['Beginner', 'Junior', 'Senior'],
    },
    seasonID: {
      type: 'int',
    },
    retiradoApoderado: {
      type: 'boolean',
      default: false,
    },
    datosApoderado: {
      type: 'json',
      nullable: true,
    },
    guardianID: {
      type: 'int',
      nullable: true,
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
    guardian: {
      type: 'many-to-one',
      target: 'Guardian',
      joinColumn: { name: 'guardianID' },
      nullable: true,
    },
    attendances: {
      type: 'one-to-many',
      target: 'Attendance',
      inverseSide: 'student',
    },
  },
});

module.exports = StudentSchema;
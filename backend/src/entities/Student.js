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
    emailEncrypted: { type: 'text', nullable: true },
    emailHash: { type: 'varchar', length: 64, nullable: true },
    fechaNac: {
      type: 'date',
      nullable: true,
    },
    rut: {
      type: 'varchar',
      length: 20,
      nullable: true,
    },
    rutEncrypted: { type: 'text', nullable: true },
    rutHash: { type: 'varchar', length: 64, nullable: true },
    categoria: {
      type: 'enum',
      enum: ['Beginner', 'Junior', 'Senior'],
    },
    seasonID: {
      type: 'int',
    },
    retiradoPrograma: {
      type: 'boolean',
      default: false,
    },
    retiradoPorUserID: {
      type: 'int',
      nullable: true,
    },
    retiradoEn: {
      type: 'timestamp',
      nullable: true,
    },
    retiradoApoderado: {
      type: 'boolean',
      nullable: true,
      default: null,
    },
    datosApoderado: {
      type: 'json',
      nullable: true,
    },
    guardianID: {
      type: 'int',
      nullable: true,
    },
    qrUrl: {
      type: 'varchar',
      length: 500,
      nullable: true,
    },
    teamID: {
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
    team: {
      type: 'many-to-one',
      target: 'Team',
      joinColumn: { name: 'teamID' },
      nullable: true,
    },
    retiradoPor: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: { name: 'retiradoPorUserID' },
      nullable: true,
    },
    attendances: {
      type: 'one-to-many',
      target: 'Attendance',
      inverseSide: 'student',
    },
  },
  indices: [
    {
      name: 'UQ_students_rut_hash_season',
      columns: ['rutHash', 'seasonID'],
      unique: true,
    },
  ],
});

module.exports = StudentSchema;

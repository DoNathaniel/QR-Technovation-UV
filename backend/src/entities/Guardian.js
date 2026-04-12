'use strict';
const { EntitySchema } = require('typeorm');

const GuardianSchema = new EntitySchema({
  name: 'Guardian',
  tableName: 'guardians',
  columns: {
    id: {
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
    telefono: {
      type: 'varchar',
      length: 20,
      nullable: true,
    },
    rut: {
      type: 'varchar',
      length: 20,
      nullable: true,
    },
    seasonId: {
      type: 'int',
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
    estudiantes: {
      type: 'one-to-many',
      target: 'Student',
      inverseSide: 'guardian',
    },
  },
});

module.exports = GuardianSchema;
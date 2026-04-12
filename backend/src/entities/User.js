'use strict';
const { EntitySchema } = require('typeorm');

const UserSchema = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: 'int',
      primary: true,
      generated: true,
    },
    nombre: {
      type: 'varchar',
      length: 100,
    },
    apellido: {
      type: 'varchar',
      length: 100,
    },
    email: {
      type: 'varchar',
      length: 255,
      unique: true,
    },
    password: {
      type: 'varchar',
      length: 255,
    },
    rol: {
      type: 'enum',
      enum: ['superadmin', 'admin', 'voluntario'],
      default: 'voluntario',
    },
    temporadas: {
      type: 'simple-array',
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
});

module.exports = UserSchema;
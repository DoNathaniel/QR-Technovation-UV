'use strict';
const { DataSource } = require('typeorm');
const UserSchema = require('../entities/User');
const SeasonSchema = require('../entities/Season');
const SeasonDateSchema = require('../entities/SeasonDate');
const GuardianSchema = require('../entities/Guardian');
const StudentSchema = require('../entities/Student');
const AttendanceSchema = require('../entities/Attendance');

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'asistencia_db',
  synchronize: true,
  logging: false,
  entities: [UserSchema, SeasonSchema, SeasonDateSchema, GuardianSchema, StudentSchema, AttendanceSchema],
  migrations: [],
  subscribers: [],
});

module.exports = { AppDataSource };
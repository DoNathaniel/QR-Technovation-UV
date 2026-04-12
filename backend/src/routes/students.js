'use strict';
const express = require('express');
const { AppDataSource } = require('../database/data-source');
const StudentSchema = require('../entities/Student');

const router = express.Router();
const studentRepository = () => AppDataSource.getRepository(StudentSchema);

router.get('/', async (req, res) => {
  try {
    const seasonId = req.query.seasonId;
    const categoria = req.query.categoria;
    
    const where = {};
    if (seasonId) where.seasonId = Number(seasonId);
    if (categoria) where.categoria = categoria;

    const students = await studentRepository().find({ where });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estudiantes' });
  }
});

module.exports = router;
'use strict';
const express = require('express');
const { authenticateToken, checkRole } = require('../middleware');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();

router.post('/', attendanceController.register);
router.get('/date/:date', attendanceController.getByDate);
router.get('/student/:studentID', attendanceController.getByStudent);
router.get('/stats', attendanceController.getStats);
router.get('/season/:seasonID', attendanceController.getBySeason);
router.patch('/justificar', authenticateToken, checkRole('superadmin', 'admin'), attendanceController.justificar);
router.post('/manual/entrada', authenticateToken, checkRole('superadmin', 'admin'), attendanceController.manualEntrada);
router.post('/manual/salida', authenticateToken, checkRole('superadmin', 'admin'), attendanceController.manualSalida);

module.exports = router;
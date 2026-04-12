'use strict';
const express = require('express');
const guardianController = require('../controllers/guardianController');
const { authenticateToken, checkRole } = require('../middleware');

const router = express.Router();

// superadmin y admin pueden ver y editar; voluntario solo podría ver si así se define
router.get('/', authenticateToken, checkRole('superadmin', 'admin'), guardianController.getAll);
router.get('/:id', authenticateToken, checkRole('superadmin', 'admin'), guardianController.getById);
router.get('/:id/students', authenticateToken, checkRole('superadmin', 'admin'), guardianController.getStudentsByGuardianId); // NUEVO ENDPOINT
router.post('/', authenticateToken, checkRole('superadmin', 'admin'), guardianController.create);
router.put('/:id', authenticateToken, checkRole('superadmin', 'admin'), guardianController.update);
router.delete('/:id', authenticateToken, checkRole('superadmin'), guardianController.remove);

module.exports = router;

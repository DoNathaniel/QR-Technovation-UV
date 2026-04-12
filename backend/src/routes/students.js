'use strict';
const express = require('express');
const studentController = require('../controllers/studentController');
const { authenticateToken, checkRole } = require('../middleware');

const router = express.Router();

router.get('/', authenticateToken, checkRole('superadmin', 'admin', 'voluntario'), studentController.getAll);
router.get('/:id/qr', authenticateToken, checkRole('superadmin', 'admin', 'voluntario'), studentController.getQR);
router.get('/:id', authenticateToken, checkRole('superadmin', 'admin', 'voluntario'), studentController.getById);
router.post('/', authenticateToken, checkRole('superadmin', 'admin'), studentController.create);
router.put('/:id', authenticateToken, checkRole('superadmin', 'admin'), studentController.update);
router.delete('/:id', authenticateToken, checkRole('superadmin', 'admin'), studentController.remove);
router.post('/:id/resend-qr', authenticateToken, checkRole('superadmin', 'admin'), studentController.resendQR);

module.exports = router;

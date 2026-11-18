'use strict';
const express = require('express');
const { authenticateToken, checkRole } = require('../middleware');
const controller = require('../controllers/maintenanceController');

const router = express.Router();
router.get('/status', authenticateToken, controller.getStatus);
router.put('/status', authenticateToken, checkRole('superadmin'), controller.updateStatus);

module.exports = router;

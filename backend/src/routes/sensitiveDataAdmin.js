'use strict';
const express = require('express');
const controller = require('../controllers/sensitiveDataAdminController');
const { authenticateToken, checkRole } = require('../middleware');

const router = express.Router();
router.use(authenticateToken, checkRole('superadmin'));
router.get('/status', controller.getStatus);
router.get('/logs', controller.getLogs);
router.post('/migrate', controller.runMigration);

module.exports = router;

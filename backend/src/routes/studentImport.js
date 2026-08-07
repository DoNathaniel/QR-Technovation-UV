'use strict';
const express = require('express');
const { authenticateToken, checkRole } = require('../middleware');
const controller = require('../controllers/studentImportController');

const router = express.Router();
router.post('/preview', authenticateToken, checkRole('superadmin'), express.raw({ type: '*/*', limit: '10mb' }), controller.preview);
router.post('/commit', authenticateToken, checkRole('superadmin'), controller.commit);

module.exports = router;

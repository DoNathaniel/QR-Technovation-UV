'use strict';
const express = require('express');
const { authenticateToken, checkRole } = require('../middleware');
const controller = require('../controllers/mailAuditController');

const router = express.Router();
router.use(authenticateToken, checkRole('superadmin', 'admin'));
router.get('/filters', controller.getFilters);
router.get('/', controller.list);
router.get('/:id', controller.getById);

module.exports = router;

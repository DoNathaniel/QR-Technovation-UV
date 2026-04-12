'use strict';
const express = require('express');
const seasonController = require('../controllers/seasonController');
const { authenticateToken, checkRole } = require('../middleware');

const router = express.Router();

router.get('/', authenticateToken, seasonController.getAll);
router.get('/:id', authenticateToken, seasonController.getById);
router.post('/', authenticateToken, checkRole('superadmin'), seasonController.create);
router.put('/:id', authenticateToken, checkRole('superadmin'), seasonController.update);
router.delete('/:id', authenticateToken, checkRole('superadmin'), seasonController.remove);

module.exports = router;

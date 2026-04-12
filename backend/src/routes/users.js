'use strict';
const express = require('express');
const userController = require('../controllers/userController');
const { authenticateToken, checkRole } = require('../middleware');

const router = express.Router();

router.get('/', authenticateToken, checkRole('superadmin', 'admin'), userController.getAll);
router.post('/', authenticateToken, checkRole('superadmin', 'admin'), userController.create);
router.put('/:id', authenticateToken, checkRole('superadmin', 'admin'), userController.update);
router.delete('/:id', authenticateToken, checkRole('superadmin'), userController.remove);

module.exports = router;

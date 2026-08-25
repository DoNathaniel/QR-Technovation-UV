'use strict';
const express = require('express');
const { authenticateToken, checkRole } = require('../middleware');
const controller = require('../controllers/mentorAttendanceController');

const router = express.Router();

router.use(authenticateToken);
router.get('/mine', controller.getMine);
router.use(checkRole('superadmin', 'admin'));
router.get('/dashboard', controller.getDashboard);
router.get('/', controller.getByDate);
router.post('/scan', controller.registerFromQR);

module.exports = router;

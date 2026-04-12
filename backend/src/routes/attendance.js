'use strict';
const express = require('express');
const attendanceController = require('../controllers/attendanceController');

const router = express.Router();

router.post('/', attendanceController.register);
router.get('/date/:date', attendanceController.getByDate);
router.get('/student/:studentID', attendanceController.getByStudent);
router.get('/stats', attendanceController.getStats);

module.exports = router;
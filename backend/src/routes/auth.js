'use strict';
const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', authController.login);
router.get('/google', authController.startGoogleLogin);
router.get('/google/callback', authController.googleCallback);
router.post('/google/session', authController.googleSession);

module.exports = router;

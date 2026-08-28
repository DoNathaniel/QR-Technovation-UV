'use strict';
const express = require('express');
const controller = require('../controllers/notificationPreferenceController');

const router = express.Router();

router.get('/unsubscribe', controller.getUnsubscribePageStatus);
router.post('/unsubscribe', controller.confirmUnsubscribe);

module.exports = router;

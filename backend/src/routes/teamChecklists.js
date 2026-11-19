'use strict';
const express = require('express');
const { authenticateToken, checkRole } = require('../middleware');
const controller = require('../controllers/teamChecklistController');

const router = express.Router();
router.use(authenticateToken);
router.get('/', checkRole('superadmin', 'admin', 'voluntario'), controller.list);
router.post('/verify-all', checkRole('superadmin', 'admin'), controller.verifyAll);
router.get('/runs/overview', checkRole('superadmin', 'admin'), controller.getRunOverview);
router.get('/runs/active', checkRole('superadmin', 'admin'), controller.getActiveRun);
router.get('/runs/:runID', checkRole('superadmin', 'admin'), controller.getRun);
router.post('/:teamID/send-status', checkRole('superadmin', 'admin'), controller.sendStatusToMentors);
router.put('/:teamID', checkRole('superadmin', 'admin'), controller.setLink);
router.delete('/:teamID', checkRole('superadmin', 'admin'), controller.unlink);
router.post('/:teamID/refresh', checkRole('superadmin', 'admin'), controller.refresh);

module.exports = router;

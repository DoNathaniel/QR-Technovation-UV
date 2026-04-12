'use strict';
const express = require('express');
const guardianController = require('../controllers/guardianController');

const router = express.Router();

router.get('/', guardianController.getAll);
router.get('/:id', guardianController.getById);
router.post('/', guardianController.create);
router.put('/:id', guardianController.update);
router.delete('/:id', guardianController.remove);

module.exports = router;
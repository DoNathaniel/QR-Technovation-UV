'use strict';
const express = require('express');
const seasonController = require('../controllers/seasonController');

const router = express.Router();

router.get('/', seasonController.getAll);
router.get('/:id', seasonController.getById);
router.post('/', seasonController.create);
router.put('/:id', seasonController.update);
router.delete('/:id', seasonController.remove);

module.exports = router;
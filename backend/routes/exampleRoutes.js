const express = require('express');
const router = express.Router();
const exampleController = require('../controllers/exampleController');

// Example routes
router.get('/', exampleController.getExamples);
router.get('/:id', exampleController.getExampleById);
router.post('/', exampleController.createExample);

module.exports = router;


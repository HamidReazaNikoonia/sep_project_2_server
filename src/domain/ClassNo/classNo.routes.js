const express = require('express');
const classNoController = require('./classNo.controller');

const router = express.Router();

// Create a new class
router.post('/', classNoController.createClassNo);

// Get all classes
router.get('/', classNoController.getAllClassNos);

// Delete a class by ID
router.delete('/:classNoId', classNoController.deleteClassNo);

module.exports = router;

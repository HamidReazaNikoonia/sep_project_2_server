const express = require('express');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const timeSlotController = require('./time_slot.controller');

const router = express.Router();

router
  .route('/')
  .get(timeSlotController.getAllTimeSlots)
  .put(timeSlotController.updateTimeSlot)
  .post(timeSlotController.createTimeSlot);


module.exports = router;

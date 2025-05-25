const express = require('express');
// const auth = require('../../middlewares/auth');

const notificationController = require('./notification.controller');

const router = express.Router();


router
  .route('/')
  .post(notificationController.create)


router
  .route('/:customer_id')
  .get(notificationController.getByCustomerId)

module.exports = router;

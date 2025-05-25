const express = require('express');
const auth = require('../../middlewares/auth');

const consultController = require('./consult.controller');

const router = express.Router();


/**
 * POST /api/consult (Create Consult By User)
 */

router
  .route('/')
  .post(auth(), consultController.create)


router
  .route('/:consultId')
  .get(consultController.getById)
  .post(consultController.applyConsult)

module.exports = router;

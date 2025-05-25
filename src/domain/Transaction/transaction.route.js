const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const transactionValidation = require('./transaction.validation');
const transactionController = require('./transaction.controller');

const router = express.Router();

/**
 * GET `api/reference` (ADMIN)
 * POST `api/reference`
 */

// Get ALL Transaction For Admin

router.route('/admin').get(transactionController.getAll);

router
  .route('/')
  .post(validate(transactionValidation.getCustomerTransactions), transactionController.getCustomerTransactions);

/**
 * GET `api/reference/:reference_id`
 */
router
  .route('/verify/:transaction_id')
  .get(validate(transactionValidation.verifyTransaction), transactionController.verifyTransaction);

// PUBLIC ROUTE FOR GET OWN TRANSACTION
router.route('/user/:transaction_id').get(auth(), transactionController.getTransactionIdForUser);

module.exports = router;

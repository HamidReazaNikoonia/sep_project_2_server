/* eslint-disable camelcase */
const httpStatus = require('http-status');
const { omit } = require('lodash');
const Transaction = require('./transaction.model');
const Reference = require('../Reference/reference.model');
const UserModel = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const pick = require('../../utils/pick');
const { verifyPay, pay } = require('../../services/payment');
const mongoose = require('mongoose');

/**
 * Transaction Get
 * @private
 */

exports.getAll = async (req, res, next) => {
  try {
    // Extract filters from query
    const filter = pick(req.query, [
      'id',
      'customer_id',
      'customer',
      'status',
      'order_id',
      'reference_id',
      'courseProgram',
      'payment_reference_id',
      'factorNumber',
      'amount_min',
      'amount_max',
      'created_from_date',
      'created_to_date',
      'updated_from_date',
      'updated_to_date',
    ]);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    // Build MongoDB query object
    const queryFilters = {};

    // 1. Filter by transaction ID
    if (filter.id) {
      queryFilters._id = mongoose.Types.ObjectId(filter.id);
    }

    // 2. Filter by customer ID
    if (filter.customer_id) {
      queryFilters.customer = mongoose.Types.ObjectId(filter.customer_id);
    }

    // 3. Filter by order ID
    if (filter.order_id) {
      queryFilters.order_id = mongoose.Types.ObjectId(filter.order_id);
    }

    // 4. Filter by reference ID
    if (filter.reference_id) {
      queryFilters.reference_id = mongoose.Types.ObjectId(filter.reference_id);
    }

    // 5. Filter by course program
    if (filter.courseProgram) {
      queryFilters.courseProgram = mongoose.Types.ObjectId(filter.courseProgram);
    }

    // 6. Filter by payment reference ID (string)
    if (filter.payment_reference_id) {
      queryFilters.payment_reference_id = filter.payment_reference_id;
    }

    // 7. Filter by factor number (string)
    if (filter.factorNumber) {
      queryFilters.factorNumber = filter.factorNumber;
    }

    // 8. Filter by status (boolean)
    if (filter.status !== undefined) {
      queryFilters.status = filter.status === 'true' || filter.status === true;
    }

    // 9. Filter by amount range
    if (filter.amount_min || filter.amount_max) {
      queryFilters.amount = {};

      if (filter.amount_min) {
        queryFilters.amount.$gte = Number(filter.amount_min);
      }

      if (filter.amount_max) {
        queryFilters.amount.$lte = Number(filter.amount_max);
      }
    }

    // 10. Date range filters for createdAt
    if (filter.created_from_date || filter.created_to_date) {
      queryFilters.createdAt = {};

      if (filter.created_from_date) {
        queryFilters.createdAt.$gte = new Date(filter.created_from_date);
      }

      if (filter.created_to_date) {
        queryFilters.createdAt.$lte = new Date(filter.created_to_date);
      }
    }

    // 11. Date range filters for updatedAt
    if (filter.updated_from_date || filter.updated_to_date) {
      queryFilters.updatedAt = {};

      if (filter.updated_from_date) {
        queryFilters.updatedAt.$gte = new Date(filter.updated_from_date);
      }

      if (filter.updated_to_date) {
        queryFilters.updatedAt.$lte = new Date(filter.updated_to_date);
      }
    }

    // 12. Search customer by name or mobile (requires aggregation for populated fields)
    if (filter.customer) {
      // This will require aggregation pipeline for searching in populated customer data
      // For now, using a simple approach - you might want to enhance this with aggregation
      const customerSearchRegex = new RegExp(filter.customer, 'i');

      // First find matching users
      const User = require('../User/user.model'); // Adjust path as needed
      const matchingUsers = await User.find({
        $or: [
          { first_name: customerSearchRegex },
          { last_name: customerSearchRegex },
          { mobile: customerSearchRegex },
        ]
      }).select('_id');

      if (matchingUsers.length > 0) {
        queryFilters.customer = {
          $in: matchingUsers.map((user) => user._id),
        };
      } else {
        // No matching users found, return empty result
        queryFilters.customer = null;
      }
    }

    // Apply filters with pagination
    const transactions = await Transaction.paginate(queryFilters, options);

    if (!transactions) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }

    res.status(httpStatus.OK);
    res.json(transactions);
  } catch (error) {
    next(error);
  }
};

exports.getTransactionIdForUser = async (req, res, next) => {
  try {
    const { transaction_id } = req.params;
    const { user } = req;
    const Err = (message = 'INTERNAL ERROR', status = null) => new ApiError(status || httpStatus.BAD_REQUEST, message);

    if (!user) {
      throw Err('User Not Found');
    }

    if (!transaction_id) {
      throw Err('Transaction Not Found');
    }

    const transactions = await Transaction.findOne({ _id: transaction_id, customer: user.id });

    if (!transactions) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }

    res.status(httpStatus.OK);
    res.json({
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerTransactions = async (req, res, next) => {
  try {
    const { customer_id } = req.body;
    const Err = (message = 'INTERNAL ERROR', status = null) => new ApiError(status || httpStatus.BAD_REQUEST, message);

    if (!customer_id) {
      throw Err('User Not Found');
    }

    const transactions = await Transaction.find({ customer: customer_id });

    if (!transactions) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }

    res.status(httpStatus.OK);
    res.json({
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Transaction Create
 * @private
 */

exports.create = async (req, res, next) => {
  try {
    const { customer_id } = req.body;

    // const Err = (message = 'INTERNAL ERROR') => new ApiError(httpStatus.NOT_FOUND, message);

    // GET customer
    const customerFromDB = await UserModel.findById(customer_id);

    if (!customerFromDB) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Customer Not Defined in DB!');
    }

    const transactionData = omit(req.body, 'status');

    // if (transactionData.amount < 1000)  {

    // }
    const transaction = await new Transaction(transactionData).save();

    if (!transaction) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction can not save');
    }

    let _payment = null;

    // Payment Cash Logic
    const payByCash = await pay(transaction.amount, transaction._id);

    if (!payByCash || payByCash.status !== 1) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment Error');
    }

    _payment = payByCash;

    res.status(httpStatus.CREATED);
    res.json({
      data: transaction,
      payment: _payment,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.transaction_id);

    if (!transaction && transaction.length === 0) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Transaction Not Found');
    }

    // Verify Transaction from Bank
    const verifyResponse = await verifyPay(req.body.token);

    // When Transaction Not found
    if (!verifyResponse) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Not Valid');
    }

    // When transaction status equal false
    if (verifyResponse.status !== 1 || !verifyResponse.transId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Payment Faild');
    }

    // Get Merchant
    const reference = await Reference.findById(transaction.recordId);

    if (!reference) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'reference Not Found');
    }

    // Set Total Amount of THIS Merchant

    reference.set({ payment_status: true });
    const updatedReference = await reference.save();

    if (!updatedReference) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Could Not Update Reference');
    }

    // Update Transaction status to be TRUE
    // eslint-disable-next-line max-len
    transaction.set({
      status: true,
      payment_reference_id: verifyResponse.transId,
      //   amount: transaction.amount,
    });
    const updatedTransaction = await transaction.save();

    res.status(httpStatus.OK);
    res.json({
      verifyResponse,
      updatedTransaction,
      updatedReference,
    });
  } catch (error) {
    next(error);
  }
};

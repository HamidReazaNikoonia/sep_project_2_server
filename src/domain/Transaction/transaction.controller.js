/* eslint-disable camelcase */
const httpStatus = require('http-status');
const { omit } = require('lodash');
const Transaction = require('./transaction.model');
const Reference = require('../Reference/reference.model');
const UserModel = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const pick = require('../../utils/pick');
const { verifyPay, pay } = require('../../services/payment');

/**
 * Transaction Get
 * @private
 */

exports.getAll = async (req, res, next) => {
  try {
    // if (!req.user) {
    //   throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
    // }

    const filter = pick(req.query, ['q', '_id']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);

    const { q, ...otherFilters } = filter;

    // If there's a search query, create a search condition
    if (q) {
      // eslint-disable-next-line security/detect-non-literal-regexp
      const searchRegex = new RegExp(q, 'i'); // Case-insensitive search
      otherFilters.$or = [{ title: searchRegex }, { sub_title: searchRegex }, { description: searchRegex }];
    }

    const transactions = await Transaction.paginate(otherFilters, options);

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

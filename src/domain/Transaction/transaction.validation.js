const Joi = require('joi');
const { objectId } = require('../../validations/custom.validation');

const getCustomerTransactions = {
  body: Joi.object().keys({
    customer_id: Joi.string().custom(objectId).required(),
  }),
};

const createTransactions = {
  body: Joi.object().keys({
    customer_id: Joi.string().custom(objectId).required(),
  }),
};

const verifyTransaction = {
  params: Joi.object().keys({
    transaction_id: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

module.exports = {
  getCustomerTransactions,
  verifyTransaction,
  createTransactions,
};

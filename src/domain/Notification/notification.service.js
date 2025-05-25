const { ObjectID } = require('mongoose');
const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');

// Models
const NotificationModel = require('./notification.model');

// utils
const ApiError = require('../../utils/ApiError');

// const pick = require('../../utils/pick');
// const ApiError = require('../../utils/ApiError');
// const catchAsync = require('../../utils/catchAsync');
// const APIFeatures = require('../../utils/APIFeatures');

const createNotification = async ({ body }) => {
  const notification = new NotificationModel(body);
  const savedNotification = await notification.save();

  if (!savedNotification) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'notification Could Not Be Save');
  }

  return savedNotification;
};

const getAllUserNotification = async ({ customer_id }) => {
  const customerNotification = await Consult.find({customer: customer_id});

  if (!customerNotification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'notification Could Not Exist');
  }

  return customerNotification;
};

module.exports = {
  createNotification,
  getAllUserNotification,
};

const httpStatus = require('http-status');

const catchAsync = require('../../utils/catchAsync');

// service
const notificationService = require('./notification.service');

const ApiError = require('../../utils/ApiError');

const create = catchAsync(async (req, res) => {
  const { customer_id, message, notification_type, sendBy } = req.body;

  const requestBodyForNotification = {
    customer: customer_id,
    message,
    notification_type: notification_type || 'from_admin',
    sendBy,
  };

  // Send By SMS if notification_type includes ["SMS"]

  const newNotification = await notificationService.createNotification({ body: requestBodyForNotification });
  res.status(httpStatus.CREATED).send(newNotification);
});

const getByCustomerId = catchAsync(async (req, res) => {
  const consultDoc = await notificationService.getAllUserNotification({
    customer_id: req.params.customer_id,
  });
  res.status(httpStatus.OK).send(consultDoc);
});

// const getAllReference = catchAsync(async (req, res) => {
//   const result = await referenceService.getAllReference({ query: req.query });
//   res.status(httpStatus.OK).send(result);
// });

// const getSpecificReference = catchAsync(async (req, res) => {
//   const result = await referenceService.getSpecificReference({
//     customer: req.query.customer,
//     reference_id: req.params.reference_id,
//   });
//   res.status(httpStatus.OK).send(result);
// });

// const createReference = catchAsync(async (req, res) => {
//   const newReference = await referenceService.createReference({ referenceBody: req.body });
//   res.status(httpStatus.CREATED).send(newReference);
// });

module.exports = {
  create,
  getByCustomerId,
};

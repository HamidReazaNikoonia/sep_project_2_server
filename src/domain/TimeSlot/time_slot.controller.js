const httpStatus = require('http-status');

const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

const timeSlotService = require('./time_slot.service');

const getAllTimeSlots = catchAsync(async (req, res) => {

  // query
  const { date } = req.query;

  const result = await timeSlotService.getAllTimeSlot({date});
  res.status(httpStatus.OK).json({ result });
});

// const getCustomer = catchAsync(async (req, res) => {
//   if (!req.query.id && !req.query.mobile) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Selected Customer Not Found!');
//   }
//   const result = await customerService.getCustomer({ id: req.query.id, mobile: req.query.mobile });
//   res.status(httpStatus.OK).send(result);
// });

const createTimeSlot = catchAsync(async (req, res) => {
  const timeSlot = await timeSlotService.createtimeSlot(req.body);

  res.status(httpStatus.CREATED).send(timeSlot);
});

const updateTimeSlot = catchAsync(async (req, res) => {
  const timeSlot = await timeSlotService.updateNewTimeSlots(req.body.slots);

  res.status(httpStatus.CREATED).send(timeSlot);
});


module.exports = {
  createTimeSlot,
  getAllTimeSlots,
  updateTimeSlot
};

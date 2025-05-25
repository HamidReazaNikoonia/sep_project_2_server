const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');

const TimeSlotModel = require('./time_slot.model');

/**
 ******************************
 * ** Create Time Slot Service **
 ******************************
 * @returns saved time-slot in database
 */
const createtimeSlot = async (body) => {
  const newTimeSlot = new TimeSlotModel(body);
  const savednewTimeSlot = await newTimeSlot.save();

  if (!savednewTimeSlot) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Time Slot Could Not Save');
  }

  return savednewTimeSlot;
};

/**
 ******************************
 * ** update Time Slot Service **
 ******************************
 * @returns saved new time-slot in database
 *
 * this function use PUT methodology, first make query to DB and find all
 * time-slot with selected (date), then remove all of them
 * and create new slots for that specific (date)
 */
 const updateNewTimeSlots = async (body) => {

  // check if all time-slot have same date
  console.log({body});
  if (!body || !Array.isArray(body)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "time-slot not exist in request body")
  }

  // get date from first item in arr
  const selectedDate = body[0] && body[0].date;

  // remove all time-slot with `selectedDate` except time-slot that booked by user
  const timeSlotDeleteResult = await TimeSlotModel.deleteMany({
    $and: [
      { date: selectedDate },        // Match documents where the date is "1403/03/03"
      { $or: [
        { isBooked: { $ne: true } }, // Either isBooked is not false
      ]}
    ]
  })


  if (!timeSlotDeleteResult) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Time Slot Could Not Save');
  }

  // create new time-slot
  const newTimeSlot = await TimeSlotModel.insertMany(body);

  return newTimeSlot;
};



/**
 ******************************
 * ** Get ALL Time Slot Service **
 ******************************
 * @returns TimeSlot[]
 */
const getAllTimeSlot = async ({date}) => {

  const query = {
    ...(date && {date}),
  }

  const timeSlots = await TimeSlotModel.find(query);

  return timeSlots;
};

module.exports = {
  createtimeSlot,
  getAllTimeSlot,
  updateNewTimeSlots
};

const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const pick = require('../../utils/pick');

const catchAsync = require('../../utils/catchAsync');
const coachService = require('./coach.service');

const config = require('../../config/config');

// Get all coaches
const getAllCoaches = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'first_name',
    'last_name',
    'mobile',
    'coach_is_valid',
    'have_active_program',
    'program_status',
    'q',
    'created_from_date',
    'created_to_date',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const coaches = await coachService.getAllCoaches(filter, options);
  res.status(httpStatus.OK).send(coaches);
});

// Get a specific coach by ID
const getCoachById = catchAsync(async (req, res) => {
  if (req.params.coachId !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to Get this coach information');
  }

  const coach = await coachService.getCoachById(req.params.coachId);
  res.status(httpStatus.OK).send(coach);
});

/**
 * @desc    Checkout coach course program
 * @route   GET /v1/coach-course-program/checkout/:coachCourseProgramId
 * @access  Private (Coach)
 */
const checkoutCoachCourseProgram = catchAsync(async (req, res) => {
  const { id: userId } = req.user;
  const { coachCourseProgramId } = req.params;

  // if (!mongoose.Types.ObjectId.isValid(coachCourseProgramId)) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid program ID');
  // }

  const checkoutResult = await coachService.checkoutCoachCourseProgram({
    userId,
    coachCourseProgramId,
  });

  res.status(httpStatus.OK).json({
    data: checkoutResult,
  });
});

const checkoutVerification = catchAsync(async (req, res) => {
  const { Authority, Status } = req.query;
  const { coachCourseProgramId } = req.params;

  if (Status !== 'OK') {
    return res.redirect(`${config.CLIENT_URL}/coach-dashboard/course/payment-result?&payment_status=false`);
  }

  const updatedOrder = await coachService.checkoutVerification({
    authority: Authority,
    status: Status,
    coachCourseProgramId,
  });

  // navigate user to the Application with query params
  // Query params => order_id, transaction_id, payment_status

  // checkoutOrder (updatedOrder variable) return
  // {order, transaction, payment}

  // return {updatedOrder}
  // return res.json({updatedOrder})

  // if (!updatedOrder?.order?._id) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Bad Request');
  // }

  res.redirect(
    `${config.CLIENT_URL}/coach-dashboard/course/payment-result?payment_status=${
      updatedOrder?.status ? 'true' : 'false'
    }&transactionId=${updatedOrder?.transaction._id}`
  );

  // res.status(httpStatus.OK).send(updatedOrder);
});

// createCoach
const createCoach = catchAsync(async (req, res) => {
  const coach = await coachService.createCoach(req.body);
  res.status(httpStatus.OK).send(coach);
});

// update coach coach_Information data
const completeCouchInfo = catchAsync(async (req, res) => {
  if (req.user.id !== req.params.coachId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized to update this coach information');
  }

  const coach = await coachService.completeCouchInfo(req.user, req.body);
  res.status(httpStatus.OK).send(coach);
});

// Coach Course Program
const getCoachCourseProgramPublic = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized User not exist on the Request');
  }

  if (req.user?.role !== 'coach') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Not authorized User Not COACH Role');
  }

  const coachCourseProgram = await coachService.getCoachCourseProgramPublic({ user: req.user });
  res.status(httpStatus.OK).send(coachCourseProgram);
});

// Admin
// Get a specific coach by ID
const getCoachByIdForAdmin = catchAsync(async (req, res) => {
  const coach = await coachService.getCoachByIdForAdmin(req.params.coachId);
  res.status(httpStatus.OK).send(coach);
});

module.exports = {
  getAllCoaches,
  createCoach,
  getCoachById,
  getCoachCourseProgramPublic,
  checkoutCoachCourseProgram,
  checkoutVerification,
  getCoachByIdForAdmin,
  completeCouchInfo,
};

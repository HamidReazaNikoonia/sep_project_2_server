/* eslint-disable camelcase */
const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const ApiError = require('../../utils/ApiError');

// Models
const UserModel = require('../../models/user.model');
const Coach = require('./coach.model');
const CouchCourseProgram = require('../Admin/coach/coachCourseProgram/coach_course_program.model');
const Transaction = require('../Transaction/transaction.model');
const { classProgramModel } = require('../Course_Session/classProgram.model');
const { Course } = require('../Course/course.model');

// Service
const ZarinpalCheckout = require('../../services/payment');
const CourseEnrollmentService = require('./courseEnrollment.service');

const config = require('../../config/config');

// Get all coaches
const getAllCoaches = async (filter, options) => {
  // return Coach.find().populate('user_id', 'name email'); // Populate user details

  const { q, created_from_date, created_to_date, coach_is_valid, have_active_program, program_status, ...otherFilters } =
    filter;

  if (q) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const searchRegex = new RegExp(q, 'i'); // Case-insensitive search
    otherFilters.$or = [{ first_name: searchRegex }, { last_name: searchRegex }, { mobile: searchRegex }];
  }

  // Filter by coach_is_valid if provided
  // if (have_active_program === 'true') {
  //   // First, find all active class programs
  //   const activePrograms = await classProgramModel.find({ status: 'active' }).distinct('coach');

  //   // Add coach ids to the filter
  //   otherFilters._id = { $in: activePrograms };
  // }

  // Filter for coaches with active programs
  if (have_active_program === 'true') {
    // First find all ClassPrograms with active status
    const activePrograms = await classProgramModel.find({ status: 'active' }).distinct('_id');

    // Then filter coaches who have at least one of these active programs
    otherFilters.courseSessionsProgram = {
      $in: activePrograms,
      $exists: true,
      $ne: [], // Ensure they have at least one program
    };
  }

  if (program_status) {
    if (program_status === 'inactive') {
      // First find all ClassPrograms with active status
      const inactivePrograms = await classProgramModel.find({ status: program_status }).distinct('_id');

      // Then filter coaches who have at least one of these active programs
      otherFilters.courseSessionsProgram = {
        $in: inactivePrograms,
        $exists: true,
        $ne: [], // Ensure they have at least one program
      };
    } else if (program_status === 'active') {
      // First find all ClassPrograms with active status
      const activePrograms = await classProgramModel.find({ status: program_status }).distinct('_id');

      // Then filter coaches who have at least one of these active programs
      otherFilters.courseSessionsProgram = {
        $in: activePrograms,
        $exists: true,
        $ne: [], // Ensure they have at least one program
      };
    } else if (program_status === 'completed') {
      console.log('completed');
      // First find all ClassPrograms with active status
      const completedPrograms = await classProgramModel.find({ status: program_status }).distinct('_id');

      // Then filter coaches who have at least one of these active programs
      otherFilters.courseSessionsProgram = {
        $in: completedPrograms,
        $exists: true,
        $ne: [], // Ensure they have at least one program
      };
    }
  }

  // Add date range filtering if dates are provided
  if (created_from_date || created_to_date) {
    otherFilters.createdAt = {};

    if (created_from_date) {
      otherFilters.createdAt.$gte = new Date(created_from_date);
    }

    if (created_to_date) {
      otherFilters.createdAt.$lte = new Date(created_to_date);
    }
  }
  const coaches = await Coach.paginate(otherFilters, options);

  return coaches;
};

// Get a specific coach by ID
const getCoachById = async (id) => {
  const coach = await Coach.findById(id);
  if (!coach) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
  }

  // find coach program and courses
  const coachProgram = await classProgramModel.find({ coach: id });
  const coachCourses = await Course.find({ coach: id });

  return {
    coach,
    coachProgram,
    coachCourses,
  };
};

// get Coach Course Program
// Get a specific coach by ID
const getCoachCourseProgramPublic = async ({ user }) => {
  const coach = await Coach.findById(user.id);
  if (!coach) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
  }

  // check if coach information exist or not
  if (!coach?.coach_Information) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach have not coach_information');
  }

  // get programs
  // Default fields to select

  const coachCoursePrograms = await await CouchCourseProgram.aggregate([
    {
      $match: { isPublished: true },
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        amount: 1,
        is_have_penalty: 1,
        penalty_fee: 1,
        course_subject_count: 1,
        createdAt: 1,
        updatedAt: 1,
        course_object_titles: {
          $map: {
            input: '$course_object',
            as: 'course',
            in: '$$course.title',
          },
        },
      },
    },
  ]);

  return coachCoursePrograms;
};

/**
 * @desc    Checkout coach course program
 * @param   {Object} options
 * @param   {string} options.userId - User ID
 * @param   {string} options.coachCourseProgramId - Program ID
 * @returns {Promise<Object>} Checkout information
 * @throws  {ApiError} If program not found or already enrolled
 */
const checkoutCoachCourseProgram = async ({ userId, coachCourseProgramId }) => {
  // 1. Check if program exists
  const program = await CouchCourseProgram.findById(coachCourseProgramId);
  if (!program) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach course program not found');
  }

  // 2. Check if user exists and is a coach
  const user = await Coach.findById(userId);
  if (!user || user.role !== 'coach') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Invalid coach account');
  }

  // 3. Check if user already enrolled
  const alreadyEnrolled = user.enrolledCourses.some(
    (course) => course.coach_course_program_id.toString() === coachCourseProgramId
  );

  if (alreadyEnrolled) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You already enrolled in this program');
  }

  // checkout
  // *** payment ***
  // Send Payment Request to Get TOKEN
  const TAX_CONSTANT = 10000;
  const factorNumber = uuidv4();
  console.log(config.CLIENT_URL);
  // console.log({ tprice: newOrder.totalAmount });
  console.log('hooo');
  const zarinpal = ZarinpalCheckout.create('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', true);
  const payment = await zarinpal.PaymentRequest({
    Amount: program.amount,
    CallbackURL: `${config.SERVER_API_URL}/coach/coach-course-program/validate-checkout/${program._id}`,
    Description: '---------',
    Mobile: user.mobile,
  });

  // Validate Payment Request

  if (!payment || payment.code !== 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Payment Error with status => ${payment.code || null}`);
  }

  // Create New Transaction
  const transaction = new Transaction({
    // coachUserId: 'NOT_SELECTED',
    courseProgram: program._id,
    customer: user.id,
    amount: program.amount,
    factorNumber: payment.authority,
    tax: TAX_CONSTANT,
  });

  const savedTransaction = await transaction.save();

  if (!savedTransaction) {
    throw new ApiError(httpStatus[500], 'Transaction Could Not Save In DB');
  }
  //--

  // 4. Return checkout information
  return {
    // program,
    // user,
    status: 'success',
    payment,
    savedTransaction,
  };
};

const checkoutVerification = async ({ authority, status, coachCourseProgramId, user }) => {
  // get Transaction
  const transaction = await Transaction.findOne({ factorNumber: authority });

  console.log('transaction @checkoutVerification');
  console.log(transaction);
  console.log(status);

  if (!transaction) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction Has Error From DB');
  }

  // Verify Payment with Payment gateway (zarinpal)
  // Verify Payment
  const zarinpal = ZarinpalCheckout.create('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', true);
  const payment = await zarinpal.PaymentVerification({
    amount: transaction.amount,
    authority: authority,
  });

  // if (payment?.data?.code !== 100) {
  //   await createNotificationService(referenceDoc.customer, "payment_fail_create_reference", {
  //     follow_up_code: referenceDoc.follow_up_code,
  //     payment_ref: payment?.data?.ref_id || '',
  //     payment_status: false,
  //     payment_status_zarinpal: false
  //   }, ["SMS"])
  // }

  // Payment Failed
  if (!payment?.data) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment Has Error From Bank');
  }

  if (payment?.data?.code !== 100) {
    switch (payment.data.code) {
      case -55:
        throw new ApiError(httpStatus.BAD_REQUEST, 'تراکنش مورد نظر یافت نشد');
        break;
      case -52:
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          ' خطای غیر منتظره‌ای رخ داده است. پذیرنده مشکل خود را به امور مشتریان زرین‌پال ارجاع دهد.'
        );
        break;
      case -50:
        throw new ApiError(httpStatus.BAD_REQUEST, 'مبلغ پرداخت شده با مقدار مبلغ ارسالی در متد وریفای متفاوت است.');
        break;
      default:
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          `Payment Transaction Faild From ZarinPal with code => ${payment.data.code} `
        );
    }
  }

  if (payment.data.code === 101) {
    throw new ApiError(httpStatus[201], 'تراکنش وریفای شده است.');
  }

  const payment_details = {
    code: payment.data.code,
    message: payment.data.message,
    card_hash: payment.data.card_hash,
    card_pan: payment.data.card_pan,
    fee_type: payment.data.fee_type,
    fee: payment.data.fee,
    shaparak_fee: payment.data.shaparak_fee,
  };

  // Transaction Pay Successfully
  if (payment.data.code === 100 && payment.data.message === 'Paid') {
    // Update Transaction
    transaction.status = true;
    transaction.payment_reference_id = payment.data.ref_id;
    transaction.payment_details = payment_details;
    await transaction.save();

    // enroll course for the user
    const userId = transaction.customer;

    console.log(`id from url params => ${coachCourseProgramId}`);
    console.log(`id from  Transactiom Model => ${transaction.courseProgram}`);
    console.log(`customer id from Transactiom Model => ${userId}`);

    const dd = await CourseEnrollmentService.enrollCoach(userId, coachCourseProgramId);

    return {
      status: true,
      transaction,
      dd,
    };
  }

  return {
    status: false,
    transaction,
  };
};

// create new coach
const createCoach = async (requestBody) => {
  if (!requestBody) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Data Not Valid');
  }

  requestBody.role = 'coach';

  const newCoach = await Coach.create(requestBody);
  return newCoach;
};

const completeCouchInfo = async (user, coachInfo) => {
  // request data validation
  if (!coachInfo) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach Information Not found');
  }

  if (!coachInfo?.national_code === ' ' || !coachInfo?.national_code) {
    throw new ApiError(httpStatus.NOT_FOUND, 'National Code Information Not Valid');
  }

  const coach = await UserModel.findById(user.id);

  if (!coach) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
  }

  coach.coach_Information = {
    ...coach.coach_Information,
    ...coachInfo,
  };

  await coach.save();
  return coach;
};

// Admin

// Get a specific coach by ID
const getCoachByIdForAdmin = async (id) => {
  const coach = await Coach.findById(id).populate('enrolledCourses.coach_course_program_id');
  if (!coach) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
  }
  return coach;
};

module.exports = {
  getAllCoaches,
  getCoachById,
  getCoachCourseProgramPublic,
  checkoutCoachCourseProgram,
  checkoutVerification,
  getCoachByIdForAdmin,
  createCoach,
  completeCouchInfo,
};

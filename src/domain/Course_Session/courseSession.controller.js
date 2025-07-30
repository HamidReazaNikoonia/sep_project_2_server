/* eslint-disable camelcase */
const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { omit } = require('lodash');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const pick = require('../../utils/pick');

// config
const config = require('../../config/config');

const courseSesshionService = require('./courseSession.service');

// models
// const Coach = require('../Coach/coach.model');
const { CourseSession } = require('./courseSession.model');
// const Upload = require('../../services/uploader/uploader.model');

// ADMIN
const getAllCoursesSessionForAdmin = catchAsync(async (req, res) => {
  // if (!req.user) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  // }

  // const filter = pick(req.query, ['title', 'subtitle', 'q', '_id', 'price_from', 'price_to']);
  const filter = omit(req.query, ['sortBy', 'limit', 'page']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const courses = await courseSesshionService.getAllCoursesSessionForAdmin({ filter, options });
  res.status(httpStatus.OK).send(courses);
});

const getAllCourses = catchAsync(async (req, res) => {
  const courses = await courseSesshionService.getAllCourses({ query: req.query });
  res.status(httpStatus.OK).send(courses);
});

const getCourseBySlugOrId = catchAsync(async (req, res) => {
  const { slug } = req.params;

  if (!slug) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Course ID or Slug');

  const isObjectId =
    mongoose.Types.ObjectId.isValid(req.params.slug) &&
    new mongoose.Types.ObjectId(req.params.slug).toString() === req.params.slug;

  // console.log({ identifier: mongoose.Types.ObjectId.isValid(req.params.slug) });
  const identifier = isObjectId ? { _id: slug } : { slug };

  const course = await courseSesshionService.getCourseBySlugOrId(identifier);
  res.status(httpStatus.OK).send(course);
});

const createCourseSession = catchAsync(async (req, res) => {
  // Validate all coaches exist
  // const coaches = await Coach.find({ _id: { $in: req.body.coaches } });
  // if (coaches.length !== req.body.coaches.length) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'One or more coaches not found');
  // }

  // Validate session coaches are in the course coaches list
  // const invalidSessions = req.body.sessions.filter((session) => !req.body.coaches.includes(session.coach));
  // if (invalidSessions.length > 0) {
  //   throw new ApiError(httpStatus.BAD_REQUEST, 'Session coach must be assigned to course');
  // }

  // Check for coach scheduling conflicts
  // await Promise.all(
  //   req.body.sessions.map(async (session) => {
  //     const isAvailable = await courseSesshionService.checkCoachAvailability(
  //       session.coach,
  //       session.date,
  //       session.startTime,
  //       session.endTime
  //     );
  //     if (!isAvailable) {
  //       throw new ApiError(httpStatus.CONFLICT, `Coach ${session.coach} has scheduling conflict`);
  //     }
  //   })
  // );

  const course = await CourseSession.create(req.body);
  res.status(httpStatus.CREATED).send(course);
});

const updateCourse = catchAsync(async (req, res) => {
  const courseSessionId = req.params.course_id;
  const updatedData = req.body;

  const updatedCourse = await courseSesshionService.updateCourse(courseSessionId, updatedData);
  res.status(httpStatus.OK).send(updatedCourse);
});

// const updateCourseSessionForAssignCoachAndTimeSlot = catchAsync(async (req, res) => {
//   // eslint-disable-next-line camelcase
//   const { course_id } = req.params;
//   const { coach_id, date, start_time, end_time, class_id, max_member_accept } = req.body;

//   if (!mongoose.Types.ObjectId.isValid(course_id)) {
//     throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
//   }

//   const updatedCourse = await courseSesshionService.updateCourseSessionForAssignCoachAndTimeSlot(course_id, {
//     coach_id,
//     class_id,
//     date,
//     start_time,
//     end_time,
//     ...(max_member_accept ? { max_member_accept } : {}),
//   });

//   res.status(httpStatus.OK).send(updatedCourse);
// });

const assignClassProgram = catchAsync(async (req, res) => {
  const { course_id } = req.params;
  const {
    coach_id,
    class_id,
    program_type,
    max_member_accept,
    sessions,
    price_real,
    price_discounted,
    is_fire_sale,
    packages,
    sample_media,
    subjects,
  } = req.body;

  // Validate course ID
  if (!mongoose.Types.ObjectId.isValid(course_id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  // Validate required fields
  if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one session is required');
  }

  const classProgram = await courseSesshionService.createClassProgram({
    course_id,
    coach_id,
    class_id,
    program_type,
    max_member_accept,
    sessions,
    price_real,
    price_discounted,
    is_fire_sale,
    packages,
    sample_media,
    subjects,
  });

  res.status(httpStatus.CREATED).send(classProgram);
});

const getAllProgramsForAdmin = catchAsync(async (req, res) => {
  if (!req?.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const filter = pick(req.query, [
    'coach_id',
    'coach_full_name',
    'course_id',
    'course_title',
    'class_id',
    'is_fire_sale',
    'mobile',
    'program_type',
    'have_members',
    'coach_is_valid',
    'status',
    'q',
    'created_from_date',
    'created_to_date',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const programs = await courseSesshionService.getAllProgramsForAdmin(filter, options);
  res.status(httpStatus.OK).send(programs);
});

const getAllProgramsOFSpecificCourse = catchAsync(async (req, res) => {
  const { course_id } = req.params;

  // Validate course ID format
  if (!mongoose.Types.ObjectId.isValid(course_id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID format');
  }

  const programs = await courseSesshionService.getAllProgramsOFSpecificCourse(course_id);

  if (!programs) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No programs found for this course');
  }

  res.status(httpStatus.OK).send({
    status: 'success',
    results: programs.length,
    data: {
      programs,
    },
  });
});

const deleteCourse = catchAsync(async (req, res) => {
  const courseId = req.params.course_id;

  await courseSesshionService.deleteCourse(courseId);
  res.status(httpStatus.NO_CONTENT).send();
});

// Get Private Course files

// const getCoursePrivateFile = catchAsync(async (req, res) => {
//   const { fileId } = req.params;
//   const userId = req.user?.id; // From authentication middleware

//   if (!userId || !fileId) {
//     throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
//   }

//   // Find the file metadata
//   const fileDoc = await Upload.findById(fileId);
//   if (!fileDoc) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
//   }

//   // Find the associated course
//   const course = await Course.findOne({
//     'course_objects.files': fileId
//   }).populate('course_objects.files');

//   if (!course) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
//   }

//   // Find the specific course object
//   const courseObject = course.course_objects.find(obj =>
//     obj.files._id.equals(fileId)
//   );

//   //  Check file accessibility
//   if (courseObject.status === 'PUBLIC') {
//     // return file if it PUBLIC
//     return courseService.sendFileDirectly(res, fileDoc.file_name);
//   }

//   //  Verify user access for private files
//   const hasAccess = await courseService.verifyCourseAccess(userId, course._id);

//   if (!hasAccess) {
//       throw new ApiError(httpStatus[403], 'Access denied');
//   }

//   //  Send the file if all checks pass
//   courseService.sendFileDirectly(res, fileDoc.file_name);

// });

// Course  Category

const getAllCategories = catchAsync(async (req, res) => {
  const categories = await courseSesshionService.getAllCategories();
  res.status(httpStatus.OK).send(categories);
});

const createCategory = catchAsync(async (req, res) => {
  const category = await courseSesshionService.createCategory(req.body);
  res.status(httpStatus.CREATED).send(category);
});

const getSubCategories = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found or not valid');
  }

  const subCategories = await courseSesshionService.getSubCategories(categoryId);
  if (!subCategories) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  res.status(httpStatus.OK).send(subCategories);
});

const createSubCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found or not valid');
  }

  const subCategory = await courseSesshionService.createSubCategory({
    categoryId,
    name: req.body.name,
  });
  res.status(httpStatus.CREATED).send(subCategory);
});

// Course Session Packages

const getAllCourseSessionPackage = catchAsync(async (req, res) => {
  const packages = await courseSesshionService.getAllCourseSessionPackage();
  res.status(httpStatus.OK).send(packages);
});

const createCourseSessionPackage = catchAsync(async (req, res) => {
  const packages = await courseSesshionService.createCourseSessionPackage(req.body);
  res.status(httpStatus.CREATED).send(packages);
});

const getSpecificProgram = catchAsync(async (req, res) => {
  const { program_id } = req.params;
  const program = await courseSesshionService.getSpecificProgram(program_id);
  res.status(httpStatus.OK).send(program);
});

/**
 *   Course Session Order Checkout Process
 *
 */

const calculateOrderSummary = catchAsync(async (req, res) => {
  const { classProgramId, couponCodes, packages, useUserWallet } = req.body;

  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  // Validate course ID
  if (!mongoose.Types.ObjectId.isValid(classProgramId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  // Calculate Order Summary
  const summary = await courseSesshionService.calculateOrderSummary({
    user: req.user,
    classProgramId,
    couponCodes,
    packages,
    useUserWallet,
  });

  if (!summary) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Could not calculate order summary from $calculateOrderSummary');
  }

  res.send(summary);
});

// Course Session Order
const createCourseSessionOrder = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  // Validate course ID
  if (!mongoose.Types.ObjectId.isValid(req.body.classProgramId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  const order = await courseSesshionService.createCourseSessionOrder({ requestBody: req.body, user: req.user });
  res.status(httpStatus.CREATED).send(order);
});

// Course Session Order
const validateCheckoutCourseSessionOrder = catchAsync(async (req, res) => {
  const { Authority, Status } = req.query;
  const { order_id } = req.params;

  if (Status !== 'OK') {
    return res.redirect(`${config.CLIENT_URL}/course-session/payment-result?order_id=${order_id}&payment_status=false`);
  }

  // Validate course ID
  if (!mongoose.Types.ObjectId.isValid(order_id)) {
    // return res.redirect(`${config.CLIENT_URL}/checkout?order_id=${order_id}&payment_status=false`);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  const validatedOrder = await courseSesshionService.validateCheckoutCourseSessionOrder({
    orderId: order_id,
    Authority,
    Status,
  });

  if (!validatedOrder) {
    return res.redirect(`${config.CLIENT_URL}/course-session/payment-result?order_id=${order_id}&payment_status=false`);
  }

  return res.redirect(
    `${config.CLIENT_URL}/course-session/payment-result?order_id=${order_id}&payment_status=${validatedOrder?.order?.paymentStatus}`
  );
  // res.status(httpStatus.OK).send(validatedOrder);
});

const getCourseSessionOrderById = catchAsync(async (req, res) => {
  const { order_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(order_id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  const order = await courseSesshionService.getCourseSessionOrderById({ orderId: order_id, user: req.user });
  res.status(httpStatus.OK).send(order);
});

const retryCourseSessionOrder = catchAsync(async (req, res) => {
  const { order_id } = req.params;

  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  // Validate course ID
  if (!mongoose.Types.ObjectId.isValid(order_id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid course ID');
  }

  const order = await courseSesshionService.retryCourseSessionOrder({ orderId: order_id, user: req.user });
  res.status(httpStatus.OK).send(order);
});

const getAllProgramsOfSpecificUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  console.log({ userId });
  const programs = await courseSesshionService.getAllProgramsOfSpecificUser(userId);
  res.status(httpStatus.OK).send(programs);
});

module.exports = {
  // admin
  getAllCoursesSessionForAdmin,
  getAllCourses,
  getCourseBySlugOrId,
  createCourseSession,
  // applyForCourse,
  updateCourse,
  assignClassProgram,
  getAllProgramsOFSpecificCourse,
  deleteCourse,
  // getCoursePrivateFile,
  // categories
  getAllCategories,
  createCategory,
  getSubCategories,
  createSubCategory,
  // package
  getAllCourseSessionPackage,
  createCourseSessionPackage,
  // Program
  getAllProgramsForAdmin,
  getSpecificProgram,
  // checkout order
  createCourseSessionOrder,
  calculateOrderSummary,
  validateCheckoutCourseSessionOrder,
  getCourseSessionOrderById,
  retryCourseSessionOrder,
  // Program
  getAllProgramsOfSpecificUser,
};

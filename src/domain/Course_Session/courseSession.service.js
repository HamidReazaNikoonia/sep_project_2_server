/* eslint-disable no-unreachable */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
/* eslint-disable no-return-await */
const path = require('node:path');
const fs = require('node:fs');
const mongoose = require('mongoose');
const httpStatus = require('http-status');
const momentJalaali = require('moment-jalaali');
const { CourseSession, CourseSessionCategory, CourseSessionSubCategory } = require('./courseSession.model');
const APIFeatures = require('../../utils/APIFeatures');
const ZarinpalCheckout = require('../../services/payment');
const config = require('../../config/config');

// Models
const Coach = require('../Coach/coach.model');
const User = require('../../models/user.model'); // Assuming User model exists
const Profile = require('../Profile/profile.model');
const CourseSessionOrderModel = require('./courseSession.order.model');
const CouponCode = require('../CouponCodes/couponCodes.model');
const Transaction = require('../Transaction/transaction.model');
// const ClassNo = require('../ClassNo/classNo.model');
const { classProgramModel, sessionPackageModel } = require('./classProgram.model');

const OrderId = require('../../utils/orderId');

const ApiError = require('../../utils/ApiError');

// const checkCoachAvailability = async (coachId, date, startTime, endTime) => {
//   // Convert Jalaali date to Gregorian for query
//   const gregorianDate = momentJalaali(date, 'jYYYY/jM/jD').format('YYYY-MM-DD');

//   // Find all scheduled sessions for this coach on this date
//   const conflictingSessions = await ClassProgram.find({
//     coach: coachId,
//     'sessions.date': gregorianDate,
//     'sessions.status': 'scheduled',
//     $or: [
//       // New session starts during existing session
//       { 'sessions.startTime': { $lt: endTime, $gte: startTime } },
//       // New session ends during existing session
//       { 'sessions.endTime': { $gt: startTime, $lte: endTime } },
//       // New session completely overlaps existing session
//       {
//         $and: [{ 'sessions.startTime': { $lte: startTime } }, { 'sessions.endTime': { $gte: endTime } }],
//       },
//     ],
//   });

//   return conflictingSessions.length === 0;
// };

// Assuming validCoupons is an array of objects with couponId
const applyCoupons = async (validCoupons) => {
  const results = await Promise.all(
    validCoupons.map(async (couponId) => {
      const coupon = await CouponCode.findById(couponId);
      if (!coupon) {
        throw new ApiError(httpStatus.NOT_FOUND, `Coupon with id ${couponId} not found`);
      }

      const isUsed = await coupon.use();
      if (!isUsed) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Coupon ${coupon.code} is no longer valid`);
      }

      return {
        couponId: coupon._id,
        // discountAmount: validCoupons.find((vc) => vc.couponId.equals(coupon._id)).discountAmount,
      };
    })
  );

  return results;
};

const checkCoachAvailability = async (coachId, date, startTime, endTime) => {
  // Convert Jalaali date to Gregorian for query
  const gregorianDate = momentJalaali(date, 'jYYYY/jM/jD').format('YYYY-MM-DD');

  // Find all class programs for this coach with sessions on this date
  const programs = await classProgramModel.find({
    coach: coachId,
    'sessions.date': gregorianDate,
    'sessions.status': 'scheduled',
  });

  // Check each session for conflicts
  for (const program of programs) {
    for (const session of program.sessions) {
      if (session.date.toISOString().split('T')[0] === gregorianDate) {
        // Check for time overlap
        if (
          (startTime < session.endTime && endTime > session.startTime) ||
          (session.startTime < endTime && session.endTime > startTime)
        ) {
          return false; // Conflict found
        }
      }
    }
  }

  return true; // No conflicts found
};

// Process session updates to separate new and existing sessions
const processSessionUpdates = (existingSessions, updatedSessions) => {
  const sessionsToAdd = [];
  const sessionsToUpdate = [];

  updatedSessions.forEach((session) => {
    if (session._id) {
      sessionsToUpdate.push(session);
    } else {
      sessionsToAdd.push(session);
    }
  });

  return { sessionsToAdd, sessionsToUpdate };
};

// Validate new sessions before adding
const validateNewSessions = async (sessions, courseCoaches) => {
  for (const session of sessions) {
    // Check session coach is assigned to course
    if (!courseCoaches.includes(session.coach)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Coach ${session.coach} is not assigned to this course`);
    }

    // Check coach availability
    const isAvailable = await checkCoachAvailability(session.coach, session.date, session.startTime, session.endTime);
    if (!isAvailable) {
      throw new ApiError(httpStatus.CONFLICT, `Coach ${session.coach} has scheduling conflict`);
    }
  }
};

// Helper function to handle complex coaches/sessions updates
// const handleCoachesAndSessions = async (course, updateData) => {
//   // Handle new coaches assignment
//   if (updateData.coaches) {
//     // Validate all coaches exist
//     const coaches = await Coach.find({ _id: { $in: updateData.coaches } });
//     if (coaches.length !== updateData.coaches.length) {
//       throw new ApiError(httpStatus.BAD_REQUEST, 'One or more coaches not found');
//     }
//     // eslint-disable-next-line no-param-reassign
//     course.coaches = updateData.coaches;
//   }

//   // Handle sessions updates
//   if (updateData.sessions) {
//     const { sessionsToAdd, sessionsToUpdate } = processSessionUpdates(course.sessions, updateData.sessions);

//     // Validate new sessions
//     await validateNewSessions(sessionsToAdd, course.coaches);

//     // Update existing sessions
//     sessionsToUpdate.forEach((updatedSession) => {
//       const existingSession = course.sessions.id(updatedSession._id);
//       if (existingSession) {
//         existingSession.set(updatedSession);
//       }
//     });

//     // Add new sessions
//     course.sessions.push(...sessionsToAdd);
//   }
// };

// Handle coaches update and clean up related sessions
const handleCoachesUpdate = async (course, updateData) => {
  const newCoaches = updateData.coaches;

  // If coaches array is being cleared or modified
  if (Array.isArray(newCoaches)) {
    // Validate all new coaches exist
    const coaches = await Coach.find({ _id: { $in: newCoaches } });
    if (coaches.length !== newCoaches.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'One or more coaches not found');
    }

    // Find removed coaches
    const removedCoaches = course.coaches.filter((coachId) => !newCoaches.includes(coachId.toString()));

    // Remove sessions belonging to removed coaches
    if (removedCoaches.length > 0) {
      // eslint-disable-next-line no-param-reassign
      course.sessions = course.sessions.filter((session) => !removedCoaches.includes(session.coach.toString()));
    }

    // Update course coaches
    // eslint-disable-next-line no-param-reassign
    course.coaches = newCoaches;
  }
};

// Handle sessions updates (existing implementation)
const handleSessionsUpdate = async (course, updateData) => {
  const { sessionsToAdd, sessionsToUpdate } = processSessionUpdates(course.sessions, updateData.sessions);

  // Validate new sessions
  await validateNewSessions(sessionsToAdd, course.coaches);

  // Update existing sessions
  sessionsToUpdate.forEach((updatedSession) => {
    const existingSession = course.sessions.id(updatedSession._id);
    if (existingSession) {
      existingSession.set(updatedSession);
    }
  });

  // Add new sessions
  course.sessions.push(...sessionsToAdd);
};

// Security helper function
function isSafePath(filePath) {
  const resolvedPath = path.resolve(filePath);
  return resolvedPath.startsWith(path.resolve(__dirname, '../../..', 'storage'));
}

const applyForCourse = async ({ courseId, userId }) => {
  const courseDoc = await CourseSession.findById(courseId);
  if (!courseDoc) {
    throw new Error('Course not found');
  }

  const userDoc = await User.findById(userId);
  if (!userDoc) {
    throw new Error('User not found');
  }

  // Check if course is full
  if (courseDoc.member.length >= courseDoc.max_member_accept) {
    throw new Error('This course has reached its maximum number of members.');
  }

  // Check if the user is already a member
  const isUserAlreadyMember = courseDoc.member.some((member) => member.user.toString() === userId);
  if (isUserAlreadyMember) {
    throw new Error('User is already a member of this course.');
  }

  // Add user to course members
  courseDoc.member.push({ user: userId });
  await courseDoc.save();

  return courseDoc;
};

// ADMIN SERVICES

const getAllCoursesSessionForAdmin = async ({ filter, options }) => {
  const { q, price_from, price_to, ...otherFilters } = filter;

  // If there's a search query, create a search condition
  if (q) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const searchRegex = new RegExp(q, 'i'); // Case-insensitive search
    otherFilters.$or = [{ title: searchRegex }, { sub_title: searchRegex }, { description: searchRegex }];
  }

  // Handle price range filtering
  if (price_from || price_to) {
    otherFilters.price = {};

    if (price_from) {
      otherFilters.price.$gte = parseFloat(price_from);
    }

    if (price_to) {
      otherFilters.price.$lte = parseFloat(price_to);
    }
  }

  const courses = await CourseSession.paginate(otherFilters, options);

  return { data: courses };
};

// Public
const getAllCourses = async ({ query }) => {
  const features = new APIFeatures(CourseSession.find({ course_status: true }), query)
    .filter()
    .search()
    .priceRange() // Apply the price range filter
    .sort()
    .dateFilter()
    .limitFields()
    .paginate();

  const courses = await features.query;
  const total = await new APIFeatures(CourseSession.find({ course_status: true }), query)
    .filter()
    .search()
    .dateFilter()
    .priceRange() // Apply the price range filter
    .count().total;

  return { data: { total, count: courses.length, courses } };
};

const getCourseBySlugOrId = async (identifier) => {
  // const query = identifier._id ? { _id: identifier._id } : { slug: identifier.slug };
  // console.log(identifier);
  return await CourseSession.findOne(identifier);
};

const createCourse = async (courseData) => {
  const course = new CourseSession(courseData);
  return await course.save();
};

// const updateCourse = async (courseSessionId, updatedData) => {
//   const course = await CourseSession.findById(courseSessionId);
//   if (!course) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
//   }

//   Object.assign(course, updatedData);
//   await course.save();

//   return course;
// };

const updateCourse = async (courseId, updateData) => {
  // 1. Get the existing course
  const course = await CourseSession.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // 2. Prepare update object (excluding restricted fields)
  const { members, course_views, ...allowedUpdates } = updateData;

  // 3. Handle coaches removal and related sessions
  if (allowedUpdates.coaches !== undefined) {
    await handleCoachesUpdate(course, allowedUpdates);
  }

  // 4. Handle sessions updates
  if (allowedUpdates.sessions) {
    await handleSessionsUpdate(course, allowedUpdates);
  }

  // 5. Update other fields
  Object.keys(allowedUpdates).forEach((key) => {
    if (key !== 'sessions' && key !== 'coaches') {
      course[key] = allowedUpdates[key];
    }
  });

  // 6. Save and return updated course
  await course.save();
  return course;
};

const createClassProgram = async ({
  course_id,
  coach_id,
  class_id,
  program_type,
  max_member_accept = 10,
  sessions,
  price_real,
  price_discounted,
  is_fire_sale,
  packages,
  sample_media,
  subjects,
}) => {
  // 1. Validate Course exists
  const course = await CourseSession.findById(course_id);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // 2. Validate Coach exists
  const coach = await Coach.findById(coach_id);
  if (!coach) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
  }

  // 3. Validate Class ID format (if needed)
  if (!class_id || typeof class_id !== 'string') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid class ID');
  }

  // Validate all sessions for this coach
  for (const session of sessions) {
    const { date, startTime, endTime } = session;
    // const gregorianDate = momentJalaali(date, 'jYYYY/jM/jD').format('YYYY-MM-DD');

    // Check time order
    if (startTime >= endTime) {
      throw new ApiError(httpStatus.BAD_REQUEST, `End time must be after start time for session on ${date}`);
    }

    // Check coach availability
    const isAvailable = await checkCoachAvailability(coach_id, date, startTime, endTime);
    if (!isAvailable) {
      throw new ApiError(httpStatus.CONFLICT, `Coach has scheduling conflict on ${date} (${startTime}-${endTime})`);
    }
  }

  const validatedSessions = sessions.map((session) => {
    const { date, startTime, endTime } = session;

    // Convert Jalaali date to Gregorian
    const gregorianDate = momentJalaali(date, 'jYYYY/jM/jD').format('YYYY-MM-DD');

    return {
      date: gregorianDate,
      startTime,
      endTime,
      status: 'scheduled',
      ...(program_type === 'ONLINE' ? { meetingLink: session.meetingLink } : { location: session.location }),
    };
  });

  // 5. Create new class program
  const classProgram = await classProgramModel.create({
    course: course_id,
    coach: coach_id,
    class_id,
    program_type,
    max_member_accept,
    sessions: validatedSessions,
    status: 'active',
    price_real,
    ...(price_discounted ? { price_discounted } : {}),
    is_fire_sale,
    packages,
    sample_media,
    subjects,
  });

  // 6. Update course coaches if not already included
  if (!course.coaches.includes(coach_id)) {
    await CourseSession.findByIdAndUpdate(course_id, { $addToSet: { coaches: coach_id } });
  }

  return classProgram;
};

const getAllProgramsOFSpecificCourse = async (courseId) => {
  // Find all class programs for the specified course
  const programs = await classProgramModel
    .find({ course: courseId })
    .populate('coach', 'first_name last_name avatar') // Populate coach details
    .populate('course', 'title sub_title thumbnail') // Populate basic course info
    .populate('sample_media.file')
    .populate('packages')
    .lean();

  // Transform dates to Jalaali format for response
  const transformedPrograms = programs.map((program) => {
    const transformedSessions = program.sessions.map((session) => {
      // const gregorianDate = momentJalaali(date, 'jYYYY/jM/jD').format('YYYY-MM-DD');

      return {
        ...session,
        date: momentJalaali(session.date).format('jYYYY/jM/jD'), // Convert to Jalaali
      };
    });

    return {
      ...program,
      sessions: transformedSessions,
    };
  });

  return transformedPrograms;
};

const getSpecificProgram = async (programId) => {
  // Find specific program by ID
  const program = await classProgramModel
    .findById(programId)
    .populate('coach', 'first_name last_name avatar') // Populate coach details
    .populate('course', 'title sub_title thumbnail') // Populate basic course info
    .populate('sample_media.file')
    .populate('packages')
    .lean();

  if (!program) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Program not found');
  }

  // Transform dates to Jalaali format
  const transformedSessions = program.sessions.map((session) => ({
    ...session,
    date: momentJalaali(session.date).format('jYYYY/jM/jD'), // Convert to Jalaali
  }));

  return {
    ...program,
    sessions: transformedSessions,
  };
};

// const updateCourseSessionForAssignCoachAndTimeSlot = async (
//   courseId,
//   { coach_id, date, start_time, end_time, class_id, max_member_accept }
// ) => {
//   // 1. Validate CourseSession exists
//   const course = await CourseSession.findById(courseId);
//   if (!course) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Course session not found');
//   }

//   // 2. Validate Coach exists
//   const coach = await Coach.findById(coach_id);
//   if (!coach) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Coach not found');
//   }

//   //  Validate ClassNo exists if provided

//   const classExists = await ClassNo.findById(class_id);
//   if (!classExists) {
//     throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
//   }

//   // 3. Check if coach is already assigned to this course
//   const isCoachAssigned = course.coaches.includes(coach_id);
//   if (!isCoachAssigned) {
//     course.coaches.push(coach_id);
//   }

//   // 4. Check coach availability
//   // const isAvailable = await checkCoachAvailability(coach_id, date, start_time, end_time);
//   // if (!isAvailable) {
//   //   throw new ApiError(httpStatus.CONFLICT, 'Coach has scheduling conflict');
//   // }
//   // 5. Validate all sessions for this coach
//   const validatedSessions = await Promise.all(
//     sessions.map(async (session) => {
//       const { date, startTime, endTime } = session;

//       // Convert Jalaali date to Gregorian
//       const gregorianDate = momentJalaali(date, 'jYYYY/jM/jD').format('YYYY-MM-DD');

//       // Check coach availability (only checks this coach's sessions)
//       const isAvailable = await checkCoachAvailability(coach_id, gregorianDate, startTime, endTime);

//       if (!isAvailable) {
//         throw new ApiError(httpStatus.CONFLICT, `Coach has scheduling conflict on ${date} (${startTime}-${endTime})`);
//       }

//       return {
//         date: gregorianDate,
//         startTime,
//         endTime,
//         status: 'scheduled',
//         ...(program_type === 'ONLINE' ? { meetingLink: session.meetingLink } : { location: session.location }),
//       };
//     })
//   );

//   // 5. Convert Jalaali date to Gregorian for storage
//   const gregorianDate = momentJalaali(date, 'jYYYY/jM/jD').format('YYYY-MM-DD');

//   // 6. Create new session
//   const newSession = {
//     coach: coach_id,
//     date: gregorianDate,
//     startTime: start_time,
//     endTime: end_time,
//     status: 'scheduled',
//   };

//   // 7. Add session to course
//   course.sessions.push(newSession);

//   // 8. Update classes if needed
//   if (classExists) {
//     // Check if class already exists for this coach
//     const existingClassIndex = course.classes.findIndex(
//       (c) => c.coach.toString() === coach_id && c.classNo.toString() === class_id
//     );

//     if (existingClassIndex >= 0) {
//       // Update existing class
//       course.classes[existingClassIndex].sessions.push({
//         date: gregorianDate,
//         startTime: start_time,
//         endTime: end_time,
//         status: 'scheduled',
//       });

//       if (max_member_accept !== undefined) {
//         course.classes[existingClassIndex].max_member_accept = max_member_accept;
//       }
//     } else {
//       // Create new class
//       const newClass = {
//         coach: coach_id,
//         classNo: class_id,
//         sessions: [
//           {
//             date: gregorianDate,
//             startTime: start_time,
//             endTime: end_time,
//             status: 'scheduled',
//           },
//         ],
//         max_member_accept: max_member_accept || 10, // Default to 10 if not provided
//         member: [],
//       };
//       course.classes.push(newClass);
//     }
//   }

//   // const coachClass = course.classes.find((c) => c.coach.toString() === coachId);
//   // if (coachClass) {
//   //   coachClass.sessions.push({
//   //     date: gregorianDate,
//   //     startTime,
//   //     endTime,
//   //     status: 'scheduled',
//   //   });
//   // }

//   await course.save();
//   return course;
// };

const deleteCourse = async (courseId) => {
  const course = await CourseSession.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  await course.deleteOne();
};

// Send Private Course File
const sendFileDirectly = async (res, fileName) => {
  const filePath = path.join(__dirname, '../../..', 'storage', fileName);

  // Validate file path to prevent directory traversal
  if (!isSafePath(filePath)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid file path');
  }

  res.setHeader('Content-Type', 'video/mp4');
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
};

// Access verification function
const verifyCourseAccess = async (userId, courseId) => {
  // get user profile
  const profile = await Profile.findOne({ user: userId });

  // check if Profile not Exist
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // check if User Have Access to this course
  const userCourseAccess = profile.courses.includes(courseId);

  // console.log({ userCourseAccess });

  return !!userCourseAccess;
  // Implement your access logic, example:
  // const enrollment = await Enrollment.findOne({
  //   user: userId,
  //   course: courseId,
  //   status: 'ACTIVE'
  // });

  // return !!enrollment;
};

// Course Category

const getAllCategories = async () => {
  return CourseSessionCategory.find({}).populate('subCategoriesDetails');
};

const createCategory = async (categoryBody) => {
  const category = await CourseSessionCategory.findOne({ name: categoryBody.name });

  if (category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category already exists');
  }
  return CourseSessionCategory.create(categoryBody);
};

const getSubCategories = async (categoryId) => {
  const category = await CourseSessionCategory.findById(categoryId).populate('subCategoriesDetails');
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  return category.subCategoriesDetails;
};

const createSubCategory = async ({ categoryId, name }) => {
  const category = await CourseSessionCategory.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parent category not found');
  }

  const subCategory = await CourseSessionSubCategory.create({
    name,
    parentCategory: categoryId,
  });

  // Add subcategory to parent
  category.subCategories.push(subCategory._id);
  await category.save();

  return subCategory;
};

// Course Session Package

const getAllCourseSessionPackage = async () => {
  const createdPackage = await sessionPackageModel.find();

  return createdPackage;
};

const createCourseSessionPackage = async (requestBody) => {
  const { title, price } = requestBody;

  const createdPackage = await sessionPackageModel.create({
    title,
    price,
  });

  return createdPackage;
};

/**
 *
 *  Course Session Order Checkout
 */

// checkout order
const createCourseSessionOrder = async ({ requestBody, user }) => {
  const { courseSessionId, classProgramId, couponCodes, packages } = requestBody;

  // var
  // let validPackages = null;
  const orderData = {
    courseSessionId,
    classProgramId,
    userId: user.id,
    paymentMethod: 'ZARINPAL',
  };

  /**
   *  Validation
   */

  // * Check If Program Exist by Id ( requestBody.programId )
  // const program = await classProgramModel.findById(classProgramId);
  // if (!program) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'Program not found');
  // }

  // Validate Packages Id if exist
  // if (requestBody?.packages && requestBody?.packages?.length > 0) {
  //   if (!requestBody.packages.every((pkg) => mongoose.Types.ObjectId.isValid(pkg))) {
  //     throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid package ID');
  //   }

  // * Get ALL Packages from `classProgramModel`
  //   packages = await sessionPackageModel.find({ _id: { $in: requestBody.packages } });
  //   if (packages.length !== requestBody.packages.length) {
  //     throw new ApiError(httpStatus.NOT_FOUND, 'One or more packages not found');
  //   }
  // }

  // IN THE CASE WE HAVE PACKAGES , ASSIGN IT TO THE `OrderData`
  // if (packages) {
  //   orderData.packages = packages.map((pkg) => pkg._id);
  // }

  // validate coupons

  // assigned property @ orderData
  // courseSessionId
  // appliedCoupons
  // transactionId
  // [X] reference
  // [X] originalAmount
  // [X] program_price_discounted
  // [X] program_price_real
  // [X] packages (orderData.packages = requestBody.packages.map((pkg) => pkg._id);)

  const {
    program,
    summary,
    packages: validPackages,
    coupons,
    // eslint-disable-next-line no-use-before-define
  } = await calculateOrderSummary({ user, classProgramId, couponCodes: couponCodes || [], packages: packages || [] });

  // validate

  if (!program || !summary) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid program or summary from $calculateOrderSummary service');
  }

  orderData.tax = summary.tax;
  orderData.program_total_price = summary.ProgramTotalPrice;
  orderData.total_discount = summary.totalDiscount;
  orderData.program_original_price = summary.ProgramOriginalAmount;
  orderData.program_price_real = program.price_real;
  orderData.final_order_price = summary.finalAmount;

  // implement prices
  if (program.price_discounted) {
    orderData.program_price_discounted = program.price_discounted;
  }

  if (summary.totalPackagePrice) {
    orderData.total_packages_price = summary.totalPackagePrice;
  }

  // add packages if exist
  if (validPackages?.length > 0) {
    orderData.packages = validPackages.map((pkg) => pkg._id);
  }

  // check if valid coupon exist
  if (coupons?.valid?.length > 0) {
    orderData.appliedCoupons = coupons.valid.map((coupon) => ({
      couponId: coupon.couponId,
      discountAmount: coupon.discountAmount,
    }));
  }

  // Generate Ref
  const orderIdGenerator = OrderId('course_session_order');
  const randomRef = Math.floor(Math.random() * 1000);
  const refrenceId = `C-${orderIdGenerator.generate()}-${randomRef}`;

  orderData.reference = refrenceId;

  // Payment Checkout ZARINPAL Process

  const newOrder = await CourseSessionOrderModel.create(orderData);

  if (!newOrder) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order could not be created (AT STORE IN DB)');
  }

  // Payment Checkout ZARINPAL Process

  const zarinpal = ZarinpalCheckout.create('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', true);
  const payment = await zarinpal.PaymentRequest({
    Amount: newOrder.final_order_price,
    CallbackURL: `${config.SERVER_API_URL}/course-session/order/${newOrder._id}/validate-checkout`,
    Description: '---------',
    Mobile: user.mobile,
    order_id: newOrder._id,
  });

  // validate Payment

  if (!payment || payment.code !== 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Payment Error with status => ${payment.code || null}`);
  }

  // TODO:: Implement Transaction
  // Create New Transaction
  const transaction = new Transaction({
    userId: user.id,
    order_id: newOrder._id,
    amount: newOrder.final_order_price,
    factorNumber: payment.authority,
    tax: summary.tax,
  });

  const savedTransaction = await transaction.save();

  if (!savedTransaction) {
    throw new ApiError(httpStatus[500], 'Transaction Could Not Save In DB');
  }

  return { order: newOrder, transaction, payment };
};

/**
 * Calculate order summary with applied coupons
 * @param {ObjectId} userId
 * @param {ObjectId} courseSessionProgramId
 * @param {Array<string>} couponCodes
 * @returns {Promise<Object>}
 */
const calculateOrderSummary = async ({ user, classProgramId, couponCodes = [], packages = [], useUserWallet = false }) => {
  // Get course session
  const courseSessionclassProgram = await classProgramModel.findById(classProgramId).populate('coach').populate('course');
  if (!courseSessionclassProgram) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course session Program not found');
  }

  // Calculate total price of packages
  let totalPackagePrice = 0;
  const selectedPackages = [];
  // Validate course ID
  if (packages.length > 0) {
    if (packages.every((pkg) => mongoose.Types.ObjectId.isValid(pkg))) {
      const packagesDocs = await sessionPackageModel.find({ _id: { $in: packages } }).lean();
      if (packages.length !== packagesDocs.length) {
        throw new ApiError(httpStatus.NOT_FOUND, 'One or more packages not found');
      }

      // Calculate total price of packages
      totalPackagePrice = packagesDocs.reduce((acc, _package) => acc + _package.price, 0) || 0;
      packagesDocs.map((pkg) => {
        selectedPackages.push({
          _id: pkg._id,
          title: pkg.title,
          price: pkg.price,
        });
      });
    }
  }

  console.log('totalPackagePrice', totalPackagePrice);

  const originalAmount = courseSessionclassProgram.price_discounted || courseSessionclassProgram.price_real;
  let validCoupons = [];
  let invalidCoupons = [];
  let totalDiscount = 0;

  // Process each coupon code
  for (const code of couponCodes) {
    try {
      const coupon = await CouponCode.findOne({
        code: code.toUpperCase(),
        is_active: true,
        // valid_from: { $lte: new Date() },
        // valid_until: { $gte: new Date() },
        $expr: { $lt: ['$current_uses', '$max_uses'] },
      });

      console.log('coupon--', coupon);

      // console.log('coupon', coupon);

      if (!coupon) {
        invalidCoupons.push({
          code,
          reason: 'Invalid or expired coupon code',
        });
        continue;
      }

      // Check minimum purchase amount
      if (originalAmount < coupon.min_purchase_amount) {
        invalidCoupons.push({
          code,
          reason: `Minimum purchase amount of ${coupon.min_purchase_amount} required`,
        });
        continue;
      }

      // Check course applicability
      if (coupon.applicable_courses?.length > 0) {
        const isApplicable = coupon.applicable_courses.some(
          (ac) =>
            (ac.target_type === 'COURSE_SESSION' && ac.target_id.equals(CourseSession)) ||
            (ac.target_type === 'COURSE' && ac.target_id.equals(CourseSession.courseId))
        );

        if (!isApplicable) {
          invalidCoupons.push({
            code,
            reason: 'Coupon not applicable for this course/session',
          });
          continue;
        }
      }

      console.log(user);
      // For referral type coupons, check if it's created by the same user
      // if (coupon.type === 'REFERRAL' && coupon.created_by.toString() === user._id.toString()) {
      //   invalidCoupons.push({
      //     code,
      //     reason: 'Cannot use your own referral code',
      //   });
      //   continue;
      // }

      // Calculate discount
      let discountAmount;
      if (coupon.discount_type === 'PERCENTAGE') {
        // Math.min ensures the discount doesn't exceed the original amount
        // e.g. if discount is 150%, we cap it at 100% of original amount
        discountAmount = Math.min((originalAmount * coupon.discount_value) / 100, originalAmount);
      } else {
        // FIXED_AMOUNT
        discountAmount = Math.min(coupon.discount_value, originalAmount);
      }

      totalDiscount += discountAmount;
      validCoupons.push({
        couponId: coupon._id,
        discountAmount,
      });
    } catch (error) {
      console.log(error);
      console.log('Error processing coupon');

      invalidCoupons.push({
        code,
        reason: 'Error processing coupon',
      });
    }
  }

  // Calculate final amount
  const calculatePrice = Math.max(0, originalAmount - totalDiscount);

  // Calculate Total Price
  const TAX_CONSTANT = 10000;
  let finalAmount = calculatePrice + TAX_CONSTANT + totalPackagePrice;

  if (useUserWallet) {
    finalAmount -= user.wallet.amount;
  }

  return {
    program: {
      ...courseSessionclassProgram.toObject(),
      coach: {
        _id: courseSessionclassProgram.coach._id,
        name: courseSessionclassProgram.coach.name,
        first_name: courseSessionclassProgram.coach.first_name,
        last_name: courseSessionclassProgram.coach.last_name,
      },
      course: {
        _id: courseSessionclassProgram.course._id,
        title: courseSessionclassProgram.course.title,
      },
    },
    // originalAmount = program price || program discounted price
    // originalAmount = sum all coupon discount
    // finalAmount = ( originalAmount - totalDiscount ) + TAX_CONSTANT + totalPackagePrice
    // totalPrice = originalAmount - totalDiscount
    summary: {
      ProgramOriginalAmount: originalAmount,
      totalDiscount,
      finalAmount,
      tax: TAX_CONSTANT,
      ProgramTotalPrice: calculatePrice,
      totalPackagePrice,
    },
    packages: selectedPackages || [],
    coupons: {
      valid: validCoupons.map((vc) => ({
        ...vc,
        code: couponCodes[validCoupons.indexOf(vc)],
      })),
      invalid: invalidCoupons,
    },
  };
};

const validateCheckoutCourseSessionOrder = async ({ orderId, user, Authority: authorityCode, Status: paymentStatus }) => {
  if (!paymentStatus || !authorityCode) {
    return false;
    // throw new ApiError(httpStatus.BAD_REQUEST, 'Query not exist from zarinpal');
  }

  const order = await CourseSessionOrderModel.findById(orderId);

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  // get Transaction
  const transaction = await Transaction.findOne({ order_id: order._id });

  if (!transaction) {
    // return false;
    throw new ApiError(httpStatus.NOT_FOUND, 'Transaction not found');
  }

  // Transaction Amount Should be same with order.final_order_price
  if (transaction.amount !== order.final_order_price) {
    // return false;
    throw new ApiError(httpStatus.BAD_REQUEST, 'Transaction amount is not equal to order final price');
  }

  const zarinpal = ZarinpalCheckout.create('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', true);
  const payment = await zarinpal.PaymentVerification({
    amount: transaction.amount,
    authority: authorityCode,
  });

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

  // Payment Information
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

    order.paymentStatus = 'paid';
    order.transactionId = transaction._id;
    await order.save();

    // Payment is Successfull
    // 1- Add member on the classProgram.member
    // 2- apply coupon (decrement coupon usage)
    // 3- update user model and push course session to `course_session_enrollments`

    // Add member to classProgram.members
    const classProgram = await classProgramModel.findById(order.classProgramId);
    if (!classProgram) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Class program not found');
    }

    // Add user as member if not already added

    classProgram.members.push({
      user: order.userId,
      enrolledAt: new Date(),
    });
    await classProgram.save();

    // 3- update user model and push course session to `course_session_enrollments`

    const userProfileModel = await Profile.findOne({ user: order.userId });
    if (!userProfileModel) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    userProfileModel.course_session_program_enrollments.push(order.classProgramId);
    await userProfileModel.save();

    // 4- apply coupon (decrement coupon usage)
    if (order?.appliedCoupons && order?.appliedCoupons?.length > 0) {
      const validCouponsIds = order.appliedCoupons.map((coupon) => coupon.couponId.toString());
      // console.log('validCouponsIds', validCouponsIds);
      // console.log('order.appliedCoupons', order.appliedCoupons);

      const appliedCoupons = await applyCoupons(validCouponsIds);
      // eslint-disable-next-line no-console
      console.log('appliedCoupons', appliedCoupons);
    }
  }

  return { order, transaction, payment };
};

const getCourseSessionOrderById = async ({ orderId, user }) => {
  if (!orderId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order ID is required');
  }

  const order = await CourseSessionOrderModel.findById(orderId).populate('transactionId');

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.userId.toString() !== user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to access this order');
  }

  return order;
};

const retryCourseSessionOrder = async ({ orderId, user }) => {
  const order = await CourseSessionOrderModel.findById(orderId);

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  if (order.userId.toString() !== user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to access this order');
  }

  if (order.paymentStatus === 'paid') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order is already paid');
  }

  if (order.paymentStatus === 'refunded') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order is already refunded');
  }

  if (order.paymentStatus === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Order is already cancelled');
  }

  // Payment Checkout ZARINPAL Process

  const zarinpal = ZarinpalCheckout.create('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', true);
  const payment = await zarinpal.PaymentRequest({
    Amount: order.final_order_price,
    CallbackURL: `${config.SERVER_API_URL}/course-session/order/${order._id}/validate-checkout`,
    Description: '---------',
    Mobile: user.mobile,
    order_id: order._id,
  });

  // validate Payment

  if (!payment || payment.code !== 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Payment Error with status => ${payment.code || null}`);
  }

  // TODO:: Implement Transaction
  // Create New Transaction
  const transaction = new Transaction({
    userId: user.id,
    order_id: order._id,
    amount: order.final_order_price,
    factorNumber: payment.authority,
    tax: order.tax,
  });

  const savedTransaction = await transaction.save();

  if (!savedTransaction) {
    throw new ApiError(httpStatus[500], 'Transaction Could Not Save In DB');
  }

  order.transactionId = savedTransaction._id;
  await order.save();

  return { order, transaction, payment };
};

module.exports = {
  checkCoachAvailability,
  // ADMIN
  getAllCoursesSessionForAdmin,
  getAllCourses,
  getCourseBySlugOrId,
  createCourse,
  applyForCourse,
  deleteCourse,
  updateCourse,
  getAllProgramsOFSpecificCourse,
  getSpecificProgram,
  // updateCourseSessionForAssignCoachAndTimeSlot,
  createClassProgram,
  sendFileDirectly,
  verifyCourseAccess,
  // categories
  getAllCategories,
  createCategory,
  getSubCategories,
  createSubCategory,
  // packages
  getAllCourseSessionPackage,
  createCourseSessionPackage,
  // order chekout
  createCourseSessionOrder,
  calculateOrderSummary,
  validateCheckoutCourseSessionOrder,
  getCourseSessionOrderById,
  retryCourseSessionOrder,
};

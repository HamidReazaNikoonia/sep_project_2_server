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
const queryParamsStringToArray = require('../../utils/queryParamsStringToArray');

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

  // If no courses found, return early
  if (!courses.results || courses.results.length === 0) {
    return courses;
  }

  // Extract course IDs from the results
  const courseIds = courses.results.map((course) => course._id);

  // Aggregate program counts by status for all courses
  const programCounts = await classProgramModel.aggregate([
    {
      $match: {
        course: { $in: courseIds },
      },
    },
    {
      $group: {
        _id: {
          courseId: '$course',
          status: '$status',
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.courseId',
        statusCounts: {
          $push: {
            status: '$_id.status',
            count: '$count',
          },
        },
      },
    },
  ]);

  // Create a map for quick lookup
  const programCountsMap = {};
  programCounts.forEach((item) => {
    const courseId = item._id.toString();
    const counts = {
      active_program: 0,
      inactive_program: 0,
      completed_program: 0,
    };

    item.statusCounts.forEach((statusCount) => {
      if (statusCount.status === 'active') {
        counts.active_program = statusCount.count;
      } else if (statusCount.status === 'inactive') {
        counts.inactive_program = statusCount.count;
      } else if (statusCount.status === 'completed') {
        counts.completed_program = statusCount.count;
      }
    });

    programCountsMap[courseId] = counts;
  });

  // Add program counts to each course
  courses.results = courses.results.map((course) => {
    const courseId = course._id.toString();
    const _programCounts = programCountsMap[courseId] || {
      active_program: 0,
      inactive_program: 0,
      completed_program: 0,
    };

    return {
      ...course.toObject(), // Convert mongoose document to plain object
      program_on_this_course: _programCounts,
    };
  });

  return courses;
};

// Public
const getAllCourses = async ({ query }) => {
  // Build the base match stage for CourseSession
  const courseSessionMatch = { course_status: true };

  // Extract pagination options
  const options = {
    limit: query.limit ? parseInt(query.limit, 10) : 10,
    page: query.page ? parseInt(query.page, 10) : 1,
    sortBy: query.sortBy || 'createdAt:desc',
  };

  // * Search filter (q) - search in title and sub_title
  if (query.q && query.q.trim()) {
    const searchRegex = new RegExp(query.q.trim(), 'i');
    courseSessionMatch.$or = [{ title: searchRegex }, { sub_title: searchRegex }];
  }

  // * Course category filter
  if (query.course_session_category) {
    if (Array.isArray(query.course_session_category)) {
      courseSessionMatch.course_session_category = { $in: query.course_session_category };
    } else {
      courseSessionMatch.course_session_category = query.course_session_category;
    }
  }

  // Build aggregation pipeline
  const pipeline = [
    // Match CourseSession documents
    { $match: courseSessionMatch },

    // Lookup active programs for each course
    {
      $lookup: {
        from: 'classprograms', // Assuming the collection name is classprograms
        let: { courseId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$course', '$$courseId'] }, { $eq: ['$status', 'active'] }],
              },
            },
          },
          // Populate coach details
          {
            $lookup: {
              from: 'users',
              localField: 'coach',
              foreignField: '_id',
              as: 'coach_details',
            },
          },
          {
            $unwind: {
              path: '$coach_details',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Populate coach avatar
          {
            $lookup: {
              from: 'uploads',
              localField: 'coach_details.avatar',
              foreignField: '_id',
              as: 'coach_avatar',
            },
          },
          {
            $unwind: {
              path: '$coach_avatar',
              preserveNullAndEmptyArrays: true,
            },
          },
          // Project the required fields for active_program
          {
            $project: {
              program_id: '$_id',
              coach: {
                _id: '$coach_details._id',
                first_name: '$coach_details.first_name',
                last_name: '$coach_details.last_name',
                avatar: '$coach_avatar.file_name',
              },
              program_price: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$is_fire_sale', true] },
                      { $ne: ['$price_discounted', null] },
                      { $gt: ['$price_discounted', 0] },
                    ],
                  },
                  then: '$price_discounted',
                  else: '$price_real',
                },
              },
              is_fire_sale: 1,
              program_type: 1,
              is_have_member: {
                $lt: ['$max_member_accept', { $size: { $ifNull: ['$members', []] } }],
              },
            },
          },
        ],
        as: 'active_programs',
      },
    },

    // Add active_program field to the response
    {
      $addFields: {
        active_program: '$active_programs',
      },
    },

    // Filter by is_have_active_program if requested
    ...(query.is_have_active_program === 'true'
      ? [
          {
            $match: {
              'active_programs.0': { $exists: true }, // Has at least one active program
            },
          },
        ]
      : []),

    // Lookup for tumbnail
    {
      $lookup: {
        from: 'uploads',
        localField: 'tumbnail',
        foreignField: '_id',
        as: 'tumbnail',
      },
    },
    {
      $unwind: {
        path: '$tumbnail',
        preserveNullAndEmptyArrays: true,
      },
    },

    // Lookup for course_session_category
    {
      $lookup: {
        from: 'course_session_categories', // Adjust collection name as needed
        localField: 'course_session_category',
        foreignField: '_id',
        as: 'course_session_category',
      },
    },

    // Remove the temporary active_programs field
    {
      $project: {
        active_programs: 0,
      },
    },
  ];

  // Get total count
  const totalPipeline = [
    ...pipeline.slice(0, -1), // Remove the final projection
    { $count: 'total' },
  ];

  const totalResult = await CourseSession.aggregate(totalPipeline);
  const total = totalResult[0]?.total || 0;

  // Add sorting
  const sortOptions = {};
  if (options.sortBy) {
    const [field, order] = options.sortBy.split(':');
    sortOptions[field] = order === 'desc' ? -1 : 1;
  } else {
    sortOptions.createdAt = -1;
  }
  pipeline.push({ $sort: sortOptions });

  // Add pagination
  const skip = (options.page - 1) * options.limit;
  pipeline.push({ $skip: skip }, { $limit: options.limit });

  // Execute aggregation
  const courses = await CourseSession.aggregate(pipeline);

  return {
    results: courses,
    page: options.page,
    limit: options.limit,
    totalPages: Math.ceil(total / options.limit),
    totalResults: total,
  };
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

const implementNewSessionForClassProgram = async ({ programId, sessions }) => {
  if (!sessions || sessions.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Sessions are required');
  }

  const program = await classProgramModel.findById(programId);
  if (!program) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Program not found');
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
    const isAvailable = await checkCoachAvailability(program?.coach, date, startTime, endTime);
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
      ...(program?.program_type === 'ONLINE' ? { meetingLink: session.meetingLink } : { location: session.location }),
    };
  });

  // Add new sessions to program
  program.sessions.push(...validatedSessions);

  // Save the updated program
  await program.save();

  return program;
};

const getAllProgramsOFSpecificCourse = async (courseId) => {
  // Find all class programs for the specified course
  const programs = await classProgramModel
    .find({ course: courseId })
    .populate({
      path: 'coach',
      select: 'first_name last_name avatar',
      populate: {
        path: 'avatar',
        model: 'Upload', // Assuming avatar references the Upload model
      },
    }) // Populate coach details
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
    .populate({
      path: 'coach',
      select: 'first_name last_name avatar',
      populate: {
        path: 'avatar',
        select: 'file_name',
      },
    }) // Populate coach details with avatar filename
    .populate({
      path: 'course',
      select: 'title sub_title tumbnail',
      populate: {
        path: 'tumbnail',
        select: 'file_name',
      },
    }) // Populate basic course info with thumbnail filename
    .populate('sample_media.file')
    .populate('class_id')
    .populate('packages')
    .populate({
      path: 'sessions.attendance.user',
      select: 'first_name last_name avatar',
      populate: {
        path: 'avatar',
        select: 'file_name',
      },
    })
    .populate({
      path: 'members.user',
      select: 'first_name last_name avatar mobile student_id',
      populate: {
        path: 'avatar',
        select: 'file_name',
      },
    })
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

const getOrdersOfProgramByIdForAdmin = async (order_id) => {
  const order = await CourseSessionOrderModel.findById(order_id)
    .populate({
      path: 'userId',
      populate: {
        path: 'avatar',
      },
    })
    .populate('transactionId')
    .populate('packages')
    .populate({
      path: 'classProgramId',
      populate: [
        {
          path: 'coach',
          populate: {
            path: 'avatar',
          },
        },
        {
          path: 'course',
        },
      ],
    })
    .populate({
      path: 'appliedCoupons',
      populate: {
        path: 'couponId',
      },
    });

  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  return order;
};

// Get all orders
const getAllOrdersOfProgramForAdmin = async (filter, options) => {
  const {
    coach_id,
    course_id,
    program_id,
    class_id,
    user_id,
    order_status,
    payment_status,
    transaction_id,
    reference,
    is_have_package,
    with_coupon,
    with_discound,
    program_discounted,
    user_search,
    program_search,
    created_from_date,
    created_to_date,
    ...otherFilters
  } = filter;

  // const { page = 1, limit = 10 } = options;
  const page = parseInt(options.page, 10) || 1;
  const limit = parseInt(options.limit, 10) || 10;

  // console.log({ filter });

  // Helper function to convert to ObjectId safely
  const toObjectId = (id) => {
    try {
      return new mongoose.Types.ObjectId(id);
    } catch (error) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
  };

  // If there's a search query, use aggregation pipeline for complex search
  if (user_search || program_search) {
    const pipeline = [];

    // Add lookups for referenced collections with proper unwinding
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'classprograms',
          localField: 'classProgramId',
          foreignField: '_id',
          as: 'classProgram',
        },
      },
      {
        $unwind: {
          path: '$classProgram',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'classProgramId.coach',
          foreignField: '_id',
          as: 'coach',
        },
      },
      // {
      //   $unwind: {
      //     path: '$coach',
      //     preserveNullAndEmptyArrays: true
      //   }
      // },
      {
        $lookup: {
          from: 'course_sessions',
          localField: 'courseSessionId',
          foreignField: '_id',
          as: 'courseSession',
        },
      },
      {
        $unwind: {
          path: '$courseSession',
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    // Add search conditions
    const searchConditions = [];

    if (user_search) {
      const userSearchRegex = new RegExp(user_search, 'i');
      searchConditions.push(
        { 'user.first_name': userSearchRegex },
        { 'user.last_name': userSearchRegex },
        { 'user.mobile': userSearchRegex }
      );
    }

    if (program_search) {
      const programSearchRegex = new RegExp(program_search, 'i');
      searchConditions.push(
        { 'coach.first_name': programSearchRegex },
        { 'coach.last_name': programSearchRegex },
        { 'coach.mobile': programSearchRegex }
      );
    }

    // Build match stage with search and other filters
    const matchConditions = [];

    if (searchConditions.length > 0) {
      matchConditions.push({ $or: searchConditions });
    }

    // Add other filters with proper ObjectId conversion
    if (coach_id) matchConditions.push({ 'coach._id': toObjectId(coach_id) });
    if (course_id) matchConditions.push({ courseSessionId: toObjectId(course_id) });
    if (program_id) matchConditions.push({ classProgramId: toObjectId(program_id) });
    if (class_id) matchConditions.push({ 'classProgram.class_id': toObjectId(class_id) });
    if (user_id) matchConditions.push({ userId: toObjectId(user_id) });
    if (order_status) matchConditions.push({ orderStatus: order_status });
    if (payment_status) matchConditions.push({ paymentStatus: payment_status });
    if (transaction_id) matchConditions.push({ transactionId: toObjectId(transaction_id) });
    if (reference) matchConditions.push({ reference });

    // Array/field existence checks
    if (is_have_package === 'true') {
      matchConditions.push({
        packages: { $exists: true, $ne: [] },
        $expr: { $gt: [{ $size: '$packages' }, 0] },
      });
    }
    if (with_coupon === 'true') {
      matchConditions.push({
        appliedCoupons: { $exists: true, $ne: [] },
        $expr: { $gt: [{ $size: '$appliedCoupons' }, 0] },
      });
    }
    if (with_discound === 'true') {
      matchConditions.push({
        total_discount: { $exists: true, $gt: 0 },
      });
    }
    if (program_discounted === 'true') {
      matchConditions.push({
        program_price_discounted: { $exists: true, $gt: 0 },
      });
    }

    // Date range filtering
    if (created_from_date || created_to_date) {
      const dateFilter = {};
      if (created_from_date) {
        dateFilter.$gte = new Date(created_from_date);
      }
      if (created_to_date) {
        dateFilter.$lte = new Date(created_to_date);
      }
      matchConditions.push({ createdAt: dateFilter });
    }

    // Add match stage only if we have conditions
    if (matchConditions.length > 0) {
      pipeline.push({
        $match: matchConditions.length === 1 ? matchConditions[0] : { $and: matchConditions },
      });
    }

    // Add pagination with proper field reconstruction
    pipeline.push({
      $facet: {
        results: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $addFields: {
              userId: '$user',
              classProgramId: '$classProgram',
              transactionId: '$transactionId',
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    // Execute aggregation
    const [result] = await CourseSessionOrderModel.aggregate(pipeline);
    const totalResults = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalResults / limit);

    return {
      results: result.results,
      page,
      limit,
      totalPages,
      totalResults,
    };
  }

  // If no search query, use standard filtering with pagination
  const matchFilters = {};

  // Basic filters with proper ObjectId conversion
  if (course_id) matchFilters.courseSessionId = toObjectId(course_id);
  if (program_id) matchFilters.classProgramId = toObjectId(program_id);
  if (user_id) matchFilters.userId = toObjectId(user_id);
  if (order_status) matchFilters.orderStatus = order_status;
  if (payment_status) matchFilters.paymentStatus = payment_status;
  if (transaction_id) matchFilters.transactionId = toObjectId(transaction_id);
  if (reference) matchFilters.reference = reference;

  // Array/field existence checks - fix the syntax
  if (is_have_package === 'true') {
    matchFilters['packages.0'] = { $exists: true };
  }
  if (with_coupon === 'true') {
    matchFilters['appliedCoupons.0'] = { $exists: true };
  }
  if (with_discound === 'true') {
    matchFilters.total_discount = { $gt: 0 };
  }
  if (program_discounted === 'true') {
    matchFilters.program_price_discounted = { $gt: 0 };
  }

  // Date range filtering
  if (created_from_date || created_to_date) {
    matchFilters.createdAt = {};
    if (created_from_date) {
      matchFilters.createdAt.$gte = new Date(created_from_date);
    }
    if (created_to_date) {
      matchFilters.createdAt.$lte = new Date(created_to_date);
    }
  }

  // For filters that require joins (coach_id, class_id), use aggregation
  if (coach_id || class_id) {
    const pipeline = [
      {
        $lookup: {
          from: 'classprograms',
          localField: 'classProgramId',
          foreignField: '_id',
          as: 'classProgram',
        },
      },
      {
        $unwind: '$classProgram',
      },
    ];

    const aggregateMatchConditions = { ...matchFilters };

    if (coach_id) {
      aggregateMatchConditions['classProgram.coach'] = toObjectId(coach_id);
    }
    if (class_id) {
      aggregateMatchConditions['classProgram.class_id'] = toObjectId(class_id);
    }

    pipeline.push({ $match: aggregateMatchConditions });

    // Add pagination
    pipeline.push({
      $facet: {
        results: [
          { $skip: (page - 1) * limit },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'userId',
            },
          },
          {
            $unwind: {
              path: '$userId',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: 'transactions',
              localField: 'transactionId',
              foreignField: '_id',
              as: 'transactionId',
            },
          },
          {
            $unwind: {
              path: '$transactionId',
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $addFields: {
              classProgramId: '$classProgram',
            },
          },
        ],
        totalCount: [{ $count: 'count' }],
      },
    });

    const [result] = await CourseSessionOrderModel.aggregate(pipeline);
    const totalResults = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalResults / limit);

    return {
      results: result.results,
      page,
      limit,
      totalPages,
      totalResults,
    };
  }

  // Use simple pagination for basic filters
  const orders = await CourseSessionOrderModel.paginate(matchFilters, {
    ...options,
    populate: 'userId,classProgramId,transactionId',
  });

  return orders;
};

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

// Update Order Status
const updateOrderStatus = async (orderId, { status }) => {
  const order = await CourseSessionOrderModel.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found');
  }

  order.orderStatus = status || 'pending';
  await order.save();

  return order;
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
  const validCoupons = [];
  const invalidCoupons = [];
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

// Program

// Add this utility function before getAllProgramsForUser
const getDateRangeForFilter = (dateFilter) => {
  const now = new Date();
  const ranges = {};

  // Helper functions
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  const startOfWeek = (date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return startOfDay(new Date(date.setDate(diff)));
  };
  const endOfWeek = (date) => {
    const start = startOfWeek(new Date(date));
    return endOfDay(new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000));
  };
  const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  // Define date ranges
  if (dateFilter.includes('today')) {
    ranges.today = {
      $gte: startOfDay(new Date(now)),
      $lte: endOfDay(new Date(now))
    };
  }

  if (dateFilter.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    ranges.tomorrow = {
      $gte: startOfDay(tomorrow),
      $lte: endOfDay(tomorrow)
    };
  }

  if (dateFilter.includes('this_week')) {
    ranges.this_week = {
      $gte: startOfWeek(new Date(now)),
      $lte: endOfWeek(new Date(now))
    };
  }

  if (dateFilter.includes('next_week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    ranges.next_week = {
      $gte: startOfWeek(nextWeek),
      $lte: endOfWeek(nextWeek)
    };
  }

  if (dateFilter.includes('this_month')) {
    ranges.this_month = {
      $gte: startOfMonth(new Date(now)),
      $lte: endOfMonth(new Date(now))
    };
  }

  if (dateFilter.includes('next_month')) {
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    ranges.next_month = {
      $gte: startOfMonth(nextMonth),
      $lte: endOfMonth(nextMonth)
    };
  }

  return ranges;
};

const getAllProgramsForUser = async (filter, options) => {
  const { page = 1, limit = 10 } = options;
  const {
    q,
    date_begin,
    selected_day,
    course_category = '',
    is_program_full_member = null,
    coach_id = null,
    packages = '',
    price_from = null,
    price_to = null,
    program_type = null,
    is_fire_sale = null,
    status = null,
    is_have_licence = null,
  } = filter;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  // Convert string parameters to arrays
  const courseCategoryArray = queryParamsStringToArray(course_category) || [];
  const packagesArray = queryParamsStringToArray(packages) || [];

  // Process date_begin filter
  const dateBeginArray = date_begin ? date_begin.split(',').map(item => item.trim()) : [];

  // Process selected_day filter (assuming it's a specific date or day of week)
  const selectedDayArray = selected_day ? selected_day.split(',').map(item => item.trim()) : [];

  console.log('courseCategoryArray', courseCategoryArray);
  console.log('coach_id', coach_id);
  console.log('dateBeginArray', dateBeginArray);
  console.log('selectedDayArray', selectedDayArray);

  // Build search conditions
  const matchConditions = [];

  // Text search
  if (q) {
    matchConditions.push(
      { 'course.title': { $regex: q, $options: 'i' } },
      { 'course.sub_title': { $regex: q, $options: 'i' } },
      { 'coach.first_name': { $regex: q, $options: 'i' } },
      { 'coach.last_name': { $regex: q, $options: 'i' } }
    );
  }

  // Course Category filter
  if (courseCategoryArray.length > 0) {
    matchConditions.push({
      'course.course_session_category': {
        $in: courseCategoryArray,
      },
    });
  }

  // Coach filter
  // if (coach_id && mongoose.Types.ObjectId.isValid(coach_id)) {
  //   matchConditions.push({
  //     coach: mongoose.Types.ObjectId(coach_id)
  //   });
  // }
  // Packages filter - Direct filter on ObjectId array
  if (packagesArray.length > 0) {
    matchConditions.push({
      packages: {
        $in: packagesArray,
      },
    });
  }

  // Program Type filter
  if (program_type) {
    matchConditions.push({ program_type });
  }

  // Fire Sale filter
  if (is_fire_sale !== null) {
    matchConditions.push({
      is_fire_sale: is_fire_sale === 'true' || is_fire_sale === true,
    });
  }

  // Status filter
  if (status) {
    matchConditions.push({ status });
  }

  // License filter
  if (is_have_licence !== null) {
    matchConditions.push({
      is_have_licence: is_have_licence === 'true' || is_have_licence === true,
    });
  }

  // Price Range filter
  const priceMatch = {};
  if (price_from !== null || price_to !== null) {
    if (price_from !== null) {
      priceMatch.$gte = Number(price_from);
    }
    if (price_to !== null) {
      priceMatch.$lte = Number(price_to);
    }
  }

  // Full Member filter
  const memberMatch = {};
  if (is_program_full_member !== null) {
    if (is_program_full_member === 'true' || is_program_full_member === true) {
      memberMatch.$expr = { $gte: [{ $size: '$members' }, '$max_member_accept'] };
    } else {
      memberMatch.$expr = { $lt: [{ $size: '$members' }, '$max_member_accept'] };
    }
  }

  // Date filters for first session
  const dateFilters = {};

  // Handle date_begin filter
  if (dateBeginArray.length > 0) {
    const dateRanges = getDateRangeForFilter(dateBeginArray);
    console.log({dateRanges});
    const dateConditions = Object.values(dateRanges);

    console.log({dateConditions});

    if (dateConditions.length > 0) {
      dateFilters.first_session_date = {
        $or: dateConditions.map(range => ({
          $and: [
            { $gte: ['$sessions.0.date', new Date(range.$gte)] },
            { $lte: ['$sessions.0.date', new Date(range.$lte)] }
          ]
        }))
      };
    }
  }

  // Handle selected_day filter (specific dates or day of week)
  if (selectedDayArray.length > 0) {
    const dayConditions = [];

    selectedDayArray.forEach(day => {
      // Check if it's a specific date (YYYY-MM-DD format)
      if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const specificDate = new Date(day);
        const startOfSpecificDay = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate());
        const endOfSpecificDay = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate(), 23, 59, 59, 999);

        dayConditions.push({
          $and: [
            { $gte: ['$sessions.0.date', startOfSpecificDay] },
            { $lte: ['$sessions.0.date', endOfSpecificDay] }
          ]
        });
      }
      // Check if it's a day of week (0-6, where 0 is Sunday)
      else if (/^[0-6]$/.test(day)) {
        dayConditions.push({
          $eq: [{ $dayOfWeek: '$sessions.0.date' }, parseInt(day) + 1] // MongoDB dayOfWeek is 1-7
        });
      }
      // Check if it's a day name (monday, tuesday, etc.)
      else {
        const dayMap = {
          'sunday': 1, 'monday': 2, 'tuesday': 3, 'wednesday': 4,
          'thursday': 5, 'friday': 6, 'saturday': 7
        };
        if (dayMap[day.toLowerCase()]) {
          dayConditions.push({
            $eq: [{ $dayOfWeek: '$sessions.0.date' }, dayMap[day.toLowerCase()]]
          });
        }
      }
    });

    if (dayConditions.length > 0) {
      dateFilters.selected_day = { $or: dayConditions };
    }
  }

  // Aggregation pipeline
  const pipeline = [
    {
      $lookup: {
        from: 'course_sessions',
        localField: 'course',
        foreignField: '_id',
        as: 'course',
      },
    },
    {
      $unwind: '$course',
    },
    // Populate course thumbnail
    {
      $lookup: {
        from: 'uploads',
        localField: 'course.tumbnail',
        foreignField: '_id',
        as: 'course_thumbnail',
      },
    },
    {
      $unwind: {
        path: '$course_thumbnail',
        preserveNullAndEmptyArrays: true,
      },
    },
    // Add thumbnail back to course object
    {
      $addFields: {
        'course.tumbnail': '$course_thumbnail',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'coach',
        foreignField: '_id',
        as: 'coach',
      },
    },
    {
      $unwind: '$coach',
    },
    // Populate coach avatar if needed
    {
      $lookup: {
        from: 'uploads',
        localField: 'coach.avatar',
        foreignField: '_id',
        as: 'coach_avatar',
      },
    },
    {
      $unwind: {
        path: '$coach_avatar',
        preserveNullAndEmptyArrays: true,
      },
    },
    // Add avatar back to coach object
    {
      $addFields: {
        'coach.avatar': '$coach_avatar',
      },
    },
    // Apply price range filter with fire sale logic
    ...(Object.keys(priceMatch).length > 0
      ? [
          {
            $addFields: {
              effectivePrice: {
                $cond: {
                  if: { $and: ['$is_fire_sale', { $ne: ['$price_discounted', null] }] },
                  then: '$price_discounted',
                  else: '$price_real',
                },
              },
            },
          },
        ]
      : []),
    // Apply date filters using $expr for complex date operations
    ...(Object.keys(dateFilters).length > 0
      ? [
          {
            $match: {
              $expr: {
                $and: [
                  // Ensure sessions array is not empty
                  { $gt: [{ $size: '$sessions' }, 0] },
                  // Apply date filters
                  ...Object.values(dateFilters)
                ]
              }
            }
          }
        ]
      : []),
    {
      $match: {
        ...(matchConditions.length > 0 ? { $or: matchConditions } : {}),
        ...(Object.keys(priceMatch).length > 0 ? { effectivePrice: priceMatch } : {}),
        ...memberMatch,
        // Handle coach_id filter separately
        ...(coach_id && mongoose.Types.ObjectId.isValid(coach_id) ? { 'coach._id': mongoose.Types.ObjectId(coach_id) } : {}),
      },
    },
    // Clean up temporary fields
    {
      $project: {
        course_thumbnail: 0,
        coach_avatar: 0,
        effectivePrice: 0,
      },
    },
    {
      $facet: {
        metadata: [
          { $count: 'totalResults' },
          {
            $addFields: {
              page: parseInt(page),
              limit: parseInt(limit),
              totalPages: {
                $ceil: { $divide: ['$totalResults', parseInt(limit)] },
              },
            },
          },
        ],
        data: [{ $skip: skip }, { $limit: parseInt(limit) }],
      },
    },
  ];
  mongoose.set('debug', true);
  const result = await classProgramModel.aggregate(pipeline);

  const metadata = result[0]?.metadata[0] || {
    totalResults: 0,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: 0,
  };

  const results = result[0]?.data || [];

  return {
    ...metadata,
    results,
  };
};

const getAllProgramsForAdmin = async (filter, options) => {
  const {
    q,
    created_from_date,
    created_to_date,
    coach_id,
    status,
    coach_full_name,
    course_id,
    course_title,
    class_id,
    is_fire_sale,
    program_type,
    have_members,
    is_have_capacity,
    is_have_capacity_in_progress,
    is_have_min_capacity,
    ...otherFilters
  } = filter;

  // If there's a search query, use aggregation pipeline for complex search
  if (q) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const searchRegex = new RegExp(q, 'i');

    // Build aggregation pipeline
    const pipeline = [];

    // Add lookups for referenced collections
    pipeline.push(
      {
        $lookup: {
          from: 'course_sessions', // or CourseSession.collection.name
          localField: 'course',
          foreignField: '_id',
          as: 'courseDetails',
        },
      },
      {
        $lookup: {
          from: 'users', // or User.collection.name
          localField: 'coach',
          foreignField: '_id',
          as: 'coachDetails',
        },
      },
      {
        $lookup: {
          from: 'classnos',
          localField: 'class_id',
          foreignField: '_id',
          as: 'classDetails',
        },
      }
    );

    // Convert lookup arrays to single objects (like populate does)
    pipeline.push({
      $addFields: {
        course: { $arrayElemAt: ['$courseDetails', 0] },
        coach: { $arrayElemAt: ['$coachDetails', 0] },
        id: '$_id',
        // Only set class_id if the lookup found something
        class_id: { $arrayElemAt: ['$classDetails', 0] },
      },
    });

    // Now lookup the coach's avatar from Upload collection
    pipeline.push({
      $lookup: {
        from: 'uploads', // Upload model collection name
        localField: 'coach.avatar',
        foreignField: '_id',
        as: 'coachAvatarDetails',
      },
    });

    // Add the avatar as a single object to the coach
    pipeline.push({
      $addFields: {
        'coach.avatar': { $arrayElemAt: ['$coachAvatarDetails', 0] },
      },
    });

    // Remove the temporary array fields
    pipeline.push({
      $project: {
        courseDetails: 0,
        coachDetails: 0,
        classDetails: 0,
        coachAvatarDetails: 0, // Remove the temporary avatar array
      },
    });

    // Build match conditions
    const matchConditions = { ...otherFilters };

    // Handle search query 'q' across multiple referenced fields
    matchConditions.$or = [
      // Search in course title/subtitle/description
      { 'course.title': searchRegex },
      // { 'course.sub_title': searchRegex },
      // { 'course.description': searchRegex },
      // Search in coach name/mobile
      { 'coach.first_name': searchRegex },
      { 'coach.last_name': searchRegex },
      { 'coach.mobile': searchRegex },
      // Search in class title
      { 'class_id.class_title': searchRegex },
      // Search in program's own fields
      // { 'subjects.title': searchRegex },
      // { 'subjects.sub_title': searchRegex },
      // { course_language: searchRegex },
      // { licence: searchRegex },
    ];

    // Add specific filters
    if (coach_id) {
      matchConditions['coach._id'] = new mongoose.Types.ObjectId(coach_id);
    }

    if (course_id) {
      matchConditions['course._id'] = new mongoose.Types.ObjectId(course_id);
    }

    if (class_id) {
      matchConditions['class_id._id'] = new mongoose.Types.ObjectId(class_id);
    }

    if (status) {
      matchConditions.status = status;
    }

    if (is_fire_sale !== undefined) {
      matchConditions.is_fire_sale = is_fire_sale === 'true';
    }

    if (program_type) {
      matchConditions.program_type = program_type;
    }

    if (have_members === 'true') {
      matchConditions['members.0'] = { $exists: true };
    }

    if (is_have_capacity === 'true') {
      matchConditions.$expr = {
        $eq: [{ $size: '$members' }, '$max_member_accept'],
      };
    }

    if (is_have_capacity_in_progress === 'true') {
      matchConditions.$expr = {
        $and: [
          { $gt: [{ $size: '$members' }, { $divide: ['$max_member_accept', 2] }] },
          { $lt: [{ $size: '$members' }, '$max_member_accept'] },
        ],
      };
    }

    // Date range filtering
    if (created_from_date || created_to_date) {
      matchConditions.createdAt = {};
      if (created_from_date) {
        matchConditions.createdAt.$gte = new Date(created_from_date);
      }
      if (created_to_date) {
        matchConditions.createdAt.$lte = new Date(created_to_date);
      }
    }

    // Add match stage
    pipeline.push({ $match: matchConditions });

    // Handle sorting (replicate paginate plugin logic)
    let sortStage = { createdAt: -1 }; // default sort
    if (options.sortBy) {
      const sortObj = {};
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        sortObj[key] = order === 'desc' ? -1 : 1;
      });
      sortStage = sortObj;
    }
    pipeline.push({ $sort: sortStage });

    // Handle pagination (replicate paginate plugin logic)
    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    // Use $facet to get both count and paginated results in one query
    pipeline.push({
      $facet: {
        // Get total count
        totalCount: [{ $count: 'count' }],
        // Get paginated results
        results: [{ $skip: skip }, { $limit: limit }],
      },
    });

    // Execute single aggregation query
    const [result] = await classProgramModel.aggregate(pipeline);

    const totalResults = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalResults / limit);

    // Return in the same format as paginate plugin
    return {
      results: result.results,
      page,
      limit,
      totalPages,
      totalResults,
    };
  }

  // If no search query, use standard filtering with pagination (existing logic)
  if (coach_id) otherFilters.coach = coach_id;
  if (course_id) otherFilters.course = course_id;
  if (class_id) otherFilters.class_id = class_id;
  if (status) otherFilters.status = status;
  if (is_fire_sale !== undefined) otherFilters.is_fire_sale = is_fire_sale === 'true';
  if (program_type) otherFilters.program_type = program_type;
  if (have_members === 'true') otherFilters['members.0'] = { $exists: true };
  if (is_have_capacity === 'true') {
    otherFilters.$expr = {
      $eq: [{ $size: '$members' }, '$max_member_accept'],
    };
  }

  if (is_have_capacity_in_progress === 'true') {
    otherFilters.$expr = {
      $and: [
        { $gt: [{ $size: '$members' }, { $divide: ['$max_member_accept', 2] }] },
        { $lt: [{ $size: '$members' }, '$max_member_accept'] },
      ],
    };
  }

  if (is_have_min_capacity === 'true') {
    otherFilters.$expr = {
      $gt: [{ $size: '$members' }, { $multiply: ['$max_member_accept', 0.2] }],
    };
  }

  // Date range filtering
  if (created_from_date || created_to_date) {
    otherFilters.createdAt = {};
    if (created_from_date) {
      otherFilters.createdAt.$gte = new Date(created_from_date);
    }
    if (created_to_date) {
      otherFilters.createdAt.$lte = new Date(created_to_date);
    }
  }

  const programs = await classProgramModel.paginate(otherFilters, options);
  return programs;
};

const getAllProgramsOfSpecificUser = async (userId) => {
  if (!userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  const userWithEnrollments = await User.findById(userId)
    .select('course_session_program_enrollments')
    .populate({
      path: 'course_session_program_enrollments.program',
      select: 'course coach class_id program_type status',
      populate: [
        {
          path: 'course',
          select: 'title _id',
        },
        {
          path: 'coach',
          select: 'first_name last_name _id',
          options: {
            autopopulate: false, // Disable for this query
            select: 'first_name last_name _id',
          },
          // transform: (doc) => ({
          //   _id: doc._id,
          //   first_name: doc.first_name,
          //   last_name: doc.last_name,
          // }),
        },
      ],
    });

  if (!userWithEnrollments) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // const programs = await classProgramModel.find({ coach: userId });

  // const userEnrollments = user.course_session_program_enrollments;

  return userWithEnrollments;
};

const getProgramMembers = async (programId) => {
  const program = await classProgramModel.findById(programId).populate({
    path: 'members.user',
    select: 'first_name last_name avatar _id',
    populate: {
      path: 'avatar',
      model: 'Upload',
    },
  });

  if (!program) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Program not found');
  }

  return program.members;
};

const completeSessionById = async ({ programId, sessionId, sessionReportDescription, presentUsers }) => {
  // Find the program
  const program = await classProgramModel.findById(programId);
  if (!program) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Program not found');
  }

  // Find the specific session
  const selectedSession = program.sessions.find((session) => session._id.toString() === sessionId);
  if (!selectedSession) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Session not found');
  }

  // Update session status to completed
  selectedSession.status = 'completed';

  // Add session report description if provided
  if (sessionReportDescription) {
    selectedSession.sessionReport = {
      description: sessionReportDescription,
      submitted_at: new Date(),
    };
  }

  const programMembers = program.members.map((member) => member.user.toString());
  // console.log('presentUsers', presentUsers);
  // console.log('program.members', program.members);
  // console.log('programMembers', programMembers);
  // Update attendance records
  // Clear existing attendance records for this session
  selectedSession.attendance = [];
  // Create a Set of present user IDs for faster lookup
  const presentUserIds = new Set(presentUsers.map((userId) => userId.toString()));

  // Add new attendance records
  selectedSession.attendance = presentUsers.map((user) => ({
    user,
    status: 'present', // Default to absent if status not provided
    note: user?.note, // Optional note will be included if provided
  }));

  // Then, add absent records for members who are not in presentUsers
  const absentMembers = programMembers.filter((memberId) => !presentUserIds.has(memberId));

  // Add absent records
  selectedSession.attendance.push(
    ...absentMembers.map((memberId) => ({
      user: memberId,
      status: 'absent',
      note: 'Automatically marked as absent',
    }))
  );

  // Save the updated program
  await program.save();

  return program;
};

const cancelSessionById = async ({ programId, sessionId }) => {
  const program = await classProgramModel.findById(programId);
  if (!program) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Program not found');
  }

  const selectedSession = program.sessions.find((session) => session._id.toString() === sessionId);
  if (!selectedSession) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Session not found');
  }

  // Update session status to cancelled
  selectedSession.status = 'cancelled';

  // TODO
  // 1- SMS to All members For Canceled Session
  // 2- SMS to Admin and coach

  // Save the updated program
  await program.save();

  return program;
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
  getAllOrdersOfProgramForAdmin,
  getOrdersOfProgramByIdForAdmin,
  updateOrderStatus,
  // Program Management
  getAllProgramsOfSpecificUser,
  getAllProgramsForUser,
  getAllProgramsForAdmin,
  getProgramMembers,
  completeSessionById,
  cancelSessionById,
  implementNewSessionForClassProgram,
};

/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
/* eslint-disable no-return-await */
const path = require('node:path');
const fs = require('node:fs');
const httpStatus = require('http-status');
const { CourseSession, CourseSessionCategory, CourseSessionSubCategory } = require('./courseSession.model');
const APIFeatures = require('../../utils/APIFeatures');

// Models
const Coach = require('../Coach/coach.model');
const User = require('../../models/user.model'); // Assuming User model exists
const Profile = require('../Profile/profile.model');

const ApiError = require('../../utils/ApiError');

const checkCoachAvailability = async (coachId, date, startTime, endTime, excludeSessionId = null) => {
  const query = {
    'sessions.coach': coachId,
    'sessions.date': date,
    'sessions.status': 'scheduled',
    $or: [
      { 'sessions.startTime': { $lt: endTime, $gte: startTime } },
      { 'sessions.endTime': { $gt: startTime, $lte: endTime } },
      {
        $and: [{ 'sessions.startTime': { $lte: startTime } }, { 'sessions.endTime': { $gte: endTime } }],
      },
    ],
  };

  if (excludeSessionId) {
    query['sessions._id'] = { $ne: excludeSessionId };
  }

  const conflictingSessions = await CourseSession.find(query);
  return conflictingSessions.length === 0;
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

// const getAllCourseCategories = async () => {
//   return await CourseCategory.find();
// };

// const createCourseCategory = async (courseData) => {
//   const newCategory = new CourseCategory(courseData);
//   return await newCategory.save();
// };

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
  sendFileDirectly,
  verifyCourseAccess,
  // categories
  getAllCategories,
  createCategory,
  getSubCategories,
  createSubCategory,
};

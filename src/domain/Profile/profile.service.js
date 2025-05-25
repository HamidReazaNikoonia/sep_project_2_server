/* eslint-disable no-restricted-syntax */
const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');

const Profile = require('./profile.model');
const UserModel = require('../../models/user.model');

const { Order } = require('../shop/Order/order.model');
const { Course } = require('../Course/course.model');

// create Profile Service
const createProfile = async (userId) => {
  const profile = await Profile.create({ user: userId });
  return profile;
};

const getProfile = async (userId) => {
  // get User Orders
  const UserOrders = await Order.find({ customer: userId });

  const courses = [];

  // Get ALl User Courses from User Orders
  if (Array.isArray(UserOrders)) {
    if (UserOrders.length !== 0) {
      for (const orderItem of UserOrders) {
        for (const orderProducts of orderItem.products) {
          if (orderProducts.course) {
            courses.push(orderProducts.course);
          }
        }
      }
    }
  }

  //  // Get Users courses
  //  const userCourses = await Course.find({ user: user.id });

  //  // Get User Favorites [Product, Course]
  //  return { user, orders: UserOrders };
  const profile = await Profile.findOne({ user: userId });
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found');
  }
  return { profile, orders: UserOrders, courses };
};

const updateProfile = async (userId, updateData) => {
  const profile = await Profile.findOne({ user: userId });
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found');
  }

  if (updateData.likedProduct) {
    profile.likedProduct = updateData.likedProduct;
  }
  if (updateData.likedCourse) {
    profile.likedCourse = updateData.likedCourse;
  }

  await profile.save();
  return profile;
};

const completeProfile = async (userId, user, { name, family, gender }) => {
  // const profile = await Profile.findOne({ user: userId });

  if (!user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User Not defined in the request');
  }

  if (userId !== user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You Dont have premission for this userId');
  }
  const currentUser = await UserModel.findById(userId);

  if (!currentUser) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (!name || !family || name === ' ' || family === ' ') {
    throw new ApiError(httpStatus.NOT_FOUND, 'name  or  family not found in request');
  }

  if (!gender || !['M', 'W'].includes(gender)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Gender Not Valid');
  }

  currentUser.first_name = name;
  currentUser.last_name = family;
  currentUser.gender = gender;

  const savedUser = await currentUser.save();

  return savedUser;
};

const getUserCourse = async ({ userId, courseId }) => {
  //  check if user exist and authenticate
  if (!userId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  // get Specific Course
  const specificCourse = await Course.findById(courseId);

  // get user profile
  const profile = await Profile.findOne({ user: userId });

  // check if course exist
  if (!specificCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // check if Profile not Exist
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // check if User Have Access to this course
  const userCourseAccess = profile.courses.includes(courseId);

  return { course: specificCourse, userCourseAccess, profile };
};

module.exports = {
  getProfile,
  updateProfile,
  getUserCourse,
  createProfile,
  completeProfile,
};

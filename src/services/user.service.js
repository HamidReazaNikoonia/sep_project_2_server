/* eslint-disable camelcase */
const httpStatus = require('http-status');
const randomstring = require('randomstring');
const { CouponJS } = require('couponjs');
const mongoose = require('mongoose');
const { User } = require('../models');
const Coach = require('../domain/Coach/coach.model');
const CouponCode = require('../domain/CouponCodes/couponCodes.model');

const ApiError = require('../utils/ApiError');

const createUserByOTP = async (userBody) => {
  return User.create(userBody);
};

const createCoachUserByOTP = async (userBody) => {
  return Coach.create(userBody);
};

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isMobileTaken(userBody.mobile)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mobile already taken');
  }

  // generate student_id
  const userStudentId = randomstring.generate({
    charset: 'numeric',
    length: 6,
  });

  const coupon = new CouponJS();
  const myCoupon = coupon.generate({
    length: 4,
    prefix: 'AVANO-',
  });

  const randomstr = randomstring.generate({
    charset: 'numeric',
    length: 4,
  });

  const referralCode = `${myCoupon}${randomstr}`;

  // Use MongoDB transaction
  const session = await mongoose.startSession();

  let userDoc;

  try {
    await session.withTransaction(async () => {
      // Create user first
      const createdUsers = await User.create(
        [
          {
            ...userBody,
            referral_code: referralCode,
            student_id: userStudentId,
          },
        ],
        { session }
      );

      // eslint-disable-next-line prefer-destructuring
      userDoc = createdUsers[0]; // Store the actual user document

      // Create coupon with user ID
      await CouponCode.create(
        [
          {
            code: referralCode,
            type: 'REFERRAL',
            discount_type: 'PERCENTAGE',
            discount_value: 20,
            max_uses: 50,
            valid_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
            created_by: userDoc._id,
          },
        ],
        { session }
      );

      // Don't return anything from the transaction function
    });

    return userDoc; // Return the actual user document
  } finally {
    await session.endSession();
  }
};

/**
 * Query for users
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  // Extract 'q' and have_enrolled_course_session from filter and remove them from the original filter object
  const { q, have_enrolled_course_session, have_wallet_amount, created_from_date, created_to_date, ...otherFilters } =
    filter;

  // If there's a search query, create a search condition
  if (q) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const searchRegex = new RegExp(q, 'i'); // Case-insensitive search
    otherFilters.$or = [{ first_name: searchRegex }, { last_name: searchRegex }, { mobile: searchRegex }];
  }

  // Add condition for enrolled course sessions if filter is true
  if (have_enrolled_course_session === 'true') {
    otherFilters['course_session_program_enrollments.0'] = { $exists: true };
  }

  // Add condition for users with wallet amount if filter is true
  if (have_wallet_amount === 'true') {
    otherFilters['wallet_amount'] = { $gt: 0 };
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

  const users = await User.paginate(otherFilters, options);
  return users;
};

/**
 * Get user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findById(id);
};

/**
 * Get coach user by id
 * @param {ObjectId} id
 * @returns {Promise<User>}
 */
const getCoachUserById = async (id) => {
  return Coach.findById(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ email });
};

/**
 * Get user by mobile
 * @param {string} mobile
 * @returns {Promise<User>}
 */
const getUserByMobile = async (mobile) => {
  return User.findOne({ mobile });
};

/**
 * Get Coach user by mobile
 * @param {string} mobile
 * @returns {Promise<User>}
 */
const getCoachUserByMobile = async (mobile) => {
  return Coach.findOne({ mobile });
};

/**
 * Update user by id
 * @param {ObjectId} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Destructure sensitive fields that shouldn't be updated directly
  const { mobile, otp, role, isEmailVerified, password, ...restUpdateBody } = updateBody;

  // Handle wallet update specifically
  if (restUpdateBody.wallet) {
    // Ensure wallet.amount is a valid number and not negative
    if (typeof restUpdateBody.wallet !== 'number' || restUpdateBody.wallet < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid wallet amount');
    }

    // Update only the wallet amount
    user.wallet_amount = restUpdateBody.wallet;

    // Remove wallet from restUpdateBody to prevent double update
    delete restUpdateBody.wallet;
  }

  // Update other fields
  Object.assign(user, restUpdateBody);

  await user.save();
  return user;
};

/**
 * Delete user by id
 * @param {ObjectId} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.remove();
  return user;
};

module.exports = {
  createUserByOTP,
  createCoachUserByOTP,
  createUser,
  queryUsers,
  getUserById,
  getCoachUserById,
  getUserByMobile,
  getCoachUserByMobile,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};

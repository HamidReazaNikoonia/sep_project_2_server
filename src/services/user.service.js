const httpStatus = require('http-status');
const { User } = require('../models');
const Coach = require('../domain/Coach/coach.model');

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
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
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
  // Extract 'q' from filter and remove it from the original filter object
  const { q, ...otherFilters } = filter;

  // If there's a search query, create a search condition
  if (q) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const searchRegex = new RegExp(q, 'i'); // Case-insensitive search
    otherFilters.$or = [{ first_name: searchRegex }, { last_name: searchRegex }, { mobile: searchRegex }];
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

  const { mobile, otp, role, isEmailVerified, password, ...restUpdateBody } = updateBody;

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

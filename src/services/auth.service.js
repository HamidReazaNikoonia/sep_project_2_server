const httpStatus = require('http-status');
const randomstring = require('randomstring');
const { CouponJS } = require('couponjs');
const tokenService = require('./token.service');
const userService = require('./user.service');
const Token = require('../models/token.model');
const CouponCode = require('../domain/CouponCodes/couponCodes.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');

const getUserForOTP = async ({ mobile, role }) => {
  const userDoc = await userService.getUserByMobile(mobile);

  // if user not exist
  if (!userDoc) {
    const coupon = new CouponJS();
    const myCoupon = coupon.generate({
      length: 4,
      prefix: 'AVANO-',
    });

    const randomstr = randomstring.generate({
      charset: 'numeric',
      length: 4,
    });

    // create referal code
    const newRefCode = await CouponCode.create({
      code: `${myCoupon}${randomstr}`,
      type: 'REFERRAL',
      discount_type: 'PERCENTAGE',
      discount_value: 20,
      max_uses: 50,
      valid_until: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      // created_by: userDoc?.id,
    });

    console.log('newRefCode', userDoc);

    if (!newRefCode) {
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create referral code');
    }

    const userData = {
      referral_code: `${myCoupon}${randomstr}`,
      mobile,
      ...(role !== 'admin' && { role: role || 'user' }),
    };
    const createdUser = await userService.createUserByOTP(userData);
    // eslint-disable-next-line no-console
    console.log('first');
    return { createdUser, firstLogin: true };
  }

  // if user exist
  return { createdUser: userDoc, firstLogin: false };
};

const getCoachUserForOTP = async ({ mobile, name, family }) => {
  const userDoc = await userService.getCoachUserByMobile(mobile);

  // if user not exist
  if (!userDoc) {
    const userData = {
      mobile,
      first_name: name,
      last_name: family,
      role: 'coach',
    };
    const createdUser = await userService.createCoachUserByOTP(userData);
    return { createdUser, firstLogin: true };
  }

  // if user exist
  return userDoc;
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserById(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.id, { password: newPassword });
    await Token.deleteMany({ user: user.id, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserById(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.id, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.id, { isEmailVerified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

module.exports = {
  getUserForOTP,
  getCoachUserForOTP,
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
};

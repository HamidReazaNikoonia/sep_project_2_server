const httpStatus = require('http-status');
const randomstring = require('randomstring');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { authService, userService, tokenService, emailService } = require('../services');
const { createProfile, getProfile } = require('../domain/Profile/profile.service');
const ProfileModel = require('../domain/Profile/profile.model');
const { Lookup } = require('../services/sms/smsProvider');

const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await tokenService.generateAuthTokens(user);
  res.status(httpStatus.CREATED).send({ user, tokens });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const loginByOTP = catchAsync(async (req, res) => {
  const { mobile, role } = req.body;

  const { createdUser, firstLogin } = await authService.getUserForOTP({ mobile, role });

  // generate OTP
  const otpStri = randomstring.generate({
    length: 6,
    charset: 'numeric',
  });

  // await Lookup(createdUser.mobile, otpStri);

  createdUser.otp = otpStri;
  await createdUser.save();

  // Send OTP By SMS to User

  // const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user: createdUser, firstLogin});
});

const loginByOTPForCoach = catchAsync(async (req, res) => {
  const { mobile, name, family } = req.body;

  const { createdUser, firstLogin } = await authService.getCoachUserForOTP({ mobile, name, family });

  // generate OTP
  const otpStri = randomstring.generate({
    length: 6,
    charset: 'numeric',
  });

  // await Lookup(user.mobile, otpStri);

  createdUser.otp = otpStri;
  await createdUser.save();

  // Send OTP By SMS to User

  // const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user: createdUser, firstLogin });
});

const validateOTPLogin = catchAsync(async (req, res) => {
  const { otpCode, userId } = req.body;

  if (!otpCode) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, 'OTP code not exist');
  }

  if (!userId) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, 'User id not exist');
  }

  // validate User OTP by database
  const userDoc = await userService.getUserById(userId);

  if (!userDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  if (userDoc.otp !== otpCode) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'OTP code not correct');
  }

  // Create Profile for this User if it not exist
  let profile = await ProfileModel.find({ user: userDoc.id });

  // check if profile exist
  if (!profile || profile?.length === 0) {
    console.log('PROFILE FOR USER CREATED');
    profile = await createProfile(userDoc.id);
  }

  // generate Token
  const tokens = await tokenService.generateAuthTokens(userDoc);

  res.send({ userDoc, tokens, profile });
});

const validateOTPLoginForCoach = catchAsync(async (req, res) => {
  const { otpCode, userId } = req.body;

  if (!otpCode) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, 'OTP code not exist');
  }

  if (!userId) {
    throw new ApiError(httpStatus.NOT_ACCEPTABLE, 'User id not exist');
  }

  // validate User OTP by database
  const userDoc = await userService.getCoachUserById(userId);

  if (!userDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  if (userDoc.otp !== otpCode) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'OTP code not correct');
  }

  // Create Profile for this User if it not exist
  let profile = await ProfileModel.find({ user: userDoc.id });

  // check if profile exist
  if (!profile || profile?.length === 0) {
    console.log('PROFILE FOR USER CREATED');
    profile = await createProfile(userDoc.id);
  }

  // generate Token
  const tokens = await tokenService.generateAuthTokens(userDoc);

  res.send({ userDoc, tokens, profile });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.query.token);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  loginByOTP,
  loginByOTPForCoach,
  validateOTPLogin,
  validateOTPLoginForCoach,
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
};

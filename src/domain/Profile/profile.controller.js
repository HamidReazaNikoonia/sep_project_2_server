/* eslint-disable camelcase */
const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const profileService = require('./profile.service');
const ApiError = require('../../utils/ApiError');

// Get a user's profile
const getProfile = catchAsync(async (req, res) => {
  const { user_id } = req.params;
  const profile = await profileService.getProfile(user_id);
  res.status(httpStatus.OK).send(profile);
});

// Update liked products or courses
const updateProfile = catchAsync(async (req, res) => {
  const { user_id } = req.params;
  const { likedProduct, likedCourse } = req.body;

  const updatedProfile = await profileService.updateProfile(user_id, {
    likedProduct,
    likedCourse,
  });

  res.status(httpStatus.OK).send(updatedProfile);
});

// Update liked products or courses
const completeProfile = catchAsync(async (req, res) => {
  const { user_id } = req.params;
  const { name, family, gender, national_card_images, nationalId, avatar } = req.body;

  const updatedProfile = await profileService.completeProfile(user_id, req.user, {
    name,
    family,
    gender,
    national_card_images,
    nationalId,
    avatar,
  });

  res.status(httpStatus.OK).send(updatedProfile);
});

const getUserCourse = catchAsync(async (req, res) => {
  const { user_id, course_id } = req.params;

  //  check if user exist and authenticate
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  if (req.user.id !== user_id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }
  const userCourse = await profileService.getUserCourse({ userId: req.user.id, courseId: course_id });
  res.status(httpStatus.OK).send(userCourse);
});

module.exports = {
  getProfile,
  updateProfile,
  getUserCourse,
  completeProfile,
};

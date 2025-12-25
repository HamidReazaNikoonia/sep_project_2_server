/* eslint-disable camelcase */
/* eslint-disable no-restricted-syntax */
const httpStatus = require('http-status');
const iranCity = require('iran-city');
const ApiError = require('../../utils/ApiError');

const Profile = require('./profile.model');
const UserModel = require('../../models/user.model');
const { validateIranianNationalId } = require('../../utils/validation');

const { Order } = require('../shop/Order/order.model');
const { Course } = require('../Course/course.model');
const courseSessionOrderModel = require('../Course_Session/courseSession.order.model');

// Validation helper functions
const exists = (value) => value !== undefined && value !== null && value !== '';
const isValidNationalId = (value) => exists(value) && validateIranianNationalId(value);

// New validation function for national_card_images
const isValidNationalCardImages = (value) => {
  console.log({ '--------------------value':value });
  // Check if value exists and is an array
  if (!exists(value) || !Array.isArray(value)) {
    return false;
  }

  // Check if array has at least one element
  if (value.length === 0) {
    return false;
  }

  // Check if each element has file_name property
  // return value.every((item) => item && exists(item.file_name));

  return true;
};
/**
 * Validates user profile completion requirements
 * @param {Object} user - The user object to validate
 * @returns {Object} - Validation result with isValid boolean and errors array
 */
const validateUserProfileCompletion = (user) => {
  const errors = [];

  // Define validation rules - scalable structure
  const validationRules = [
    {
      property: 'nationalId',
      validations: [exists, isValidNationalId],
      errorMessages: ['National ID is required', 'National ID is invalid'],
    },
    {
      property: 'national_card_images',
      validations: [isValidNationalCardImages],
      errorMessages: ['National card images are required'],
    },
    {
      property: 'postal_code',
      validations: [exists],
      errorMessages: ['Postal code is required'],
    },
    {
      property: 'address',
      validations: [exists],
      errorMessages: ['Address is required'],
    },
    {
      property: 'province',
      validations: [exists],
      errorMessages: ['Province is required'],
    },
    {
      property: 'city',
      validations: [exists],
      errorMessages: ['City is required'],
    },
    {
      property: 'first_name',
      validations: [exists],
      errorMessages: ['First name is required'],
    },
    {
      property: 'last_name',
      validations: [exists],
      errorMessages: ['Last name is required'],
    },
  ];

  // Apply validation rules
  validationRules.forEach((rule) => {
    const value = user[rule.property];

    rule.validations.forEach((validation, index) => {
      if (!validation(value)) {
        errors.push(rule.errorMessages[index] || `${rule.property} validation failed`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// create Profile Service
const createProfile = async (userId) => {
  const profile = await Profile.create({ user: userId });
  return profile;
};

const getProfile = async (userId) => {
  // get User Orders
  const UserOrders = await Order.find({ customer: userId });

  let courses = [];

  // Get ALl User Courses from User Orders
  // if (Array.isArray(UserOrders)) {
  //   if (UserOrders.length !== 0) {
  //     for (const orderItem of UserOrders) {
  //       for (const orderProducts of orderItem.products) {
  //         if (orderProducts.course) {
  //           courses.push(orderProducts.course);
  //         }
  //       }
  //     }
  //   }
  // }

  // Get enrolled user Course Session Profile
  // const userCourseSessionPrograms = await courseSessionOrderModel.find({ userId }).populate({
  //   path: 'classProgramId',
  //   populate: {
  //     path: 'course',
  //     select: 'title sub_title _id course_status',
  //   },
  //   select: 'program_type sessions status _id',
  // });

  // Get User enrollled Course session (program)
  const user = await UserModel.findById(userId)
    .populate('course_session_program_enrollments.program')
    .populate({
      path: 'enrolled_courses',
      select: 'title sub_title coach_id tumbnail_image',
      populate: [
        {
          path: 'coach_id',
          select: 'first_name last_name avatar',
          populate: {
            path: 'avatar',
            // Add any selection for avatar fields here if needed
          },
        },
        {
          path: 'tumbnail_image',
          // Add any selection for tumbnail_image fields here if needed
        },
      ],
    });
  const userCourseSessionPrograms = user.course_session_program_enrollments;

  if (user?.enrolled_courses && user?.enrolled_courses?.length > 0) {
    courses = user?.enrolled_courses;
  }

  // eslint-disable-next-line no-console
  // console.log({ UserOrders });

  //  // Get Users courses
  //  const userCourses = await Course.find({ user: user.id });

  //  // Get User Favorites [Product, Course]
  //  return { user, orders: UserOrders };
  const profile = await Profile.findOne({ user: userId });
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Profile not found');
  }
  return { profile, orders: UserOrders, courses, programs: userCourseSessionPrograms };
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

const completeProfile = async (
  userId,
  user,
  {
    name,
    family,
    gender,
    national_card_images,
    nationalId,
    avatar,
    city,
    field_of_study,
    educational_qualification,
    postalCode,
    job_title,
    address,
    personal_img,
  }
) => {
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

  if (field_of_study) {
    currentUser.field_of_study = field_of_study;
  }

  if (educational_qualification) {
    currentUser.educational_qualification = educational_qualification;
  }

  // eslint-disable-next-line no-console
  console.log({ postalCode });

  if (postalCode) {
    currentUser.postal_code = postalCode;
  }

  if (job_title) {
    currentUser.job_title = job_title;
  }

  if (address) {
    currentUser.address = address;
  }

  if (national_card_images) {
    currentUser.national_card_images = national_card_images;
  }
  if (nationalId) {
    currentUser.nationalId = nationalId;
  }
  if (avatar) {
    currentUser.avatar = avatar;
  }
  if (city) {
    currentUser.city = city;
    const cityData = iranCity.cityById(Number(city));
    // eslint-disable-next-line no-console
    console.log({ cityData: cityData.province_id });
    currentUser.province = cityData.province_id;
  }
  if (personal_img) {
    currentUser.personal_img = personal_img;
  }
  // Find the province ID based on the city ID

  // validate user profile
  const result = validateUserProfileCompletion(currentUser);
  currentUser.isProfileCompleted = !!result.isValid;

  const savedUser = await currentUser.save();

  return {
    ...(savedUser?.toObject?.() ?? savedUser),
    isProfileCompleted: currentUser.isProfileCompleted,
    validationErrors: result.errors,
  };
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
  validateUserProfileCompletion,
};

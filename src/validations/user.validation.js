const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

// const { provincesArray } = require('../utils/provinces');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().email(),
    password: Joi.string().custom(password),
    first_name: Joi.string().required(),
    last_name: Joi.string().required(),
    father_name: Joi.string(),
    personal_img: Joi.string().custom(objectId),
    avatar: Joi.string().custom(objectId),
    nationalId: Joi.string(),
    isNationalIdVerified: Joi.boolean(),
    national_card_images: Joi.array().items(Joi.string().custom(objectId)),
    age: Joi.number().integer().min(10).max(200),
    tel: Joi.string(),
    birth_date: Joi.date(),
    mobile: Joi.string().required(),
    role: Joi.string().required().valid('user', 'admin', 'coach'),
    city: Joi.number(),
    province: Joi.number(),
    country: Joi.string(),
    address: Joi.string(),
    job_title: Joi.string(),
    mariage_status: Joi.string().valid('single', 'married', 'widowed', 'divorced'),
    wallet_amount: Joi.number().min(0).max(100000000),
    gender: Joi.string().valid('W', 'M').required(),
    isVerified: Joi.boolean(),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    first_name: Joi.string(),
    last_name: Joi.string(),
    mobile: Joi.string(),
    role: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    q: Joi.string(),
    search: Joi.string(),
    isVerified: Joi.string(),
    have_enrolled_course_session: Joi.string(),
    have_wallet_amount: Joi.string(),
    created_from_date: Joi.string(),
    created_to_date: Joi.string(),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      // email: Joi.string().email(),
      // password: Joi.string().custom(password),
      first_name: Joi.string().required(),
      isVerified: Joi.boolean(),
      last_name: Joi.string().required(),
      father_name: Joi.string(),
      personal_img: Joi.string().custom(objectId),
      avatar: Joi.string().custom(objectId),
      nationalId: Joi.string(),
      isNationalIdVerified: Joi.boolean(),
      national_card_images: Joi.array().items(Joi.string().custom(objectId)),
      age: Joi.number().integer().min(10).max(200),
      gender: Joi.string().valid('W', 'M').required(),
      city: Joi.number(),
      province: Joi.number(),
      country: Joi.string(),
      address: Joi.string(),
      job_title: Joi.string(),
      tel: Joi.string(),
      birth_date: Joi.date(),
      mariage_status: Joi.string().valid('single', 'married', 'widowed', 'divorced'),
      parent_mariage_type: Joi.string().valid('FAMILY', 'NON_FAMILY'),
      wallet_amount: Joi.number().min(0).max(100000000),
      description: Joi.string(),
      description_long: Joi.string(),
      tags: Joi.array().items(Joi.string()),
      permission: Joi.boolean().optional(),
      featured: Joi.boolean().optional(),
      wallet: Joi.number().min(0).max(100000000),
    })
    .min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};

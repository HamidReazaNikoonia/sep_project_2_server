const Joi = require('joi');
const { password, objectId } = require('./custom.validation');

const { provincesArray } = require('../utils/provinces');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().required().valid('user', 'admin'),
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
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      name: Joi.string().required(),
      family: Joi.string().required(),
      age: Joi.number().integer().min(10).max(200).required(),
      gender: Joi.string().valid('WOMEN', 'MEN').required(),
      city: Joi.string().valid(...provincesArray),
      mariage_type: Joi.string().valid("FAMILY", "NON_FAMILY"),
      parent_mariage_type: Joi.string().valid("FAMILY", "NON_FAMILY"),
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

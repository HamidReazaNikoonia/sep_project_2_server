const Joi = require('joi');
// const { password, objectId } = require('./custom.validation');

const createProduct = {
  body: Joi.object().keys({
    title: Joi.string().required(),
    subtitle: Joi.string().required(),
    description: Joi.string().min(30).max(900),
    brand: Joi.string(),
    price: Joi.number().required(),
    slug: Joi.string(),
    average_rating: Joi.number(),
    qr_code: Joi.string(),
    discountable: {
      status: Joi.boolean(),
      percent: Joi.number()
    },
    countInStock: Joi.number(),
    images: Joi.array().items(Joi.string().hex().length(24)),
    thumbnail: Joi.string().hex().length(24),
    category: Joi.string().hex().length(24),
    is_available: Joi.boolean()
  }),
};

const updateProduct = {
  body: Joi.object().keys({
    title: Joi.string(),
    subtitle: Joi.string(),
    status: Joi.string().valid('publish', 'draft', 'rejected'),
    description: Joi.string().min(30).max(900),
    brand: Joi.string(),
    slug: Joi.string(),
    average_rating: Joi.number(),
    qr_code: Joi.string(),
    discountable: {
      status: Joi.boolean(),
      percent: Joi.number(),
    },
    price: Joi.number(),
    countInStock: Joi.number(),
    images: Joi.array().items(Joi.string().hex().length(24).allow(null, '')).allow(null, ''),
    thumbnail: Joi.string().hex().length(24).allow(null, ''),
    category: Joi.string().hex().length(24),
    is_available: Joi.boolean(),
  }),
};

// const getUsers = {
//   query: Joi.object().keys({
//     name: Joi.string(),
//     role: Joi.string(),
//     sortBy: Joi.string(),
//     limit: Joi.number().integer(),
//     page: Joi.number().integer(),
//   }),
// };

// const getUser = {
//   params: Joi.object().keys({
//     userId: Joi.string().custom(objectId),
//   }),
// };

// const updateUser = {
//   params: Joi.object().keys({
//     userId: Joi.required().custom(objectId),
//   }),
//   body: Joi.object()
//     .keys({
//       email: Joi.string().email(),
//       password: Joi.string().custom(password),
//       name: Joi.string(),
//     })
//     .min(1),
// };

// const deleteUser = {
//   params: Joi.object().keys({
//     userId: Joi.string().custom(objectId),
//   }),
// };

module.exports = {
  createProduct,
  updateProduct,
};

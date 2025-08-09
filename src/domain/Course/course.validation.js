const Joi = require('joi');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
  }),
};

const createSubCategory = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
  }),
  params: Joi.object().keys({
    categoryId: Joi.string().hex().length(24).required(),
  }),
};

// Add validation for course queries
const getCourses = {
  query: Joi.object()
    .keys({
      title: Joi.string().optional(),
      subtitle: Joi.string().optional(),
      q: Joi.string().optional(),
      price_from: Joi.number().min(0).optional(),
      price_to: Joi.number().min(0).optional(),
      sortBy: Joi.string().optional(),
      limit: Joi.number().integer().min(1).max(100).optional(),
      page: Joi.number().integer().min(1).optional(),
    })
    .custom((value, helpers) => {
      // Validate that price_from is not greater than price_to
      if (value.price_from && value.price_to && value.price_from > value.price_to) {
        return helpers.error('price_from cannot be greater than price_to');
      }
      return value;
    }),
};

module.exports = {
  courseCategoryValidation: {
    createCategory,
    createSubCategory,
  },
  getCourses,
};

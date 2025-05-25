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

module.exports = {
  courseCategoryValidation: {
    createCategory,
    createSubCategory,
  },
};

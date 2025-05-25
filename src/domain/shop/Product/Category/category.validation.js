const Joi = require('joi');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    user: Joi.string().required(), // Assuming `user` is a string representing the user ID
  }),
};

const getCategoryByUserId = {
  params: Joi.object().keys({
    collectionId: Joi.string().required(), // Assuming `collectionId` is a string representing the collection ID
  }),
};

const deleteCategoryById = {
  params: Joi.object().keys({
    collectionId: Joi.string().required(), // Assuming `collectionId` is a string representing the collection ID
  }),
};

module.exports = {
  createCategory,
  getCategoryByUserId,
  deleteCategoryById,
};

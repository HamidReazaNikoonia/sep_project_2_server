const Joi = require('joi');

const createCollection = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().required(),
    product: Joi.array(),
  }),
  params: Joi.object().keys({
    merchantId: Joi.string().hex().length(24), // Assuming `collectionId` is a string representing the collection ID
  }),
};

const getCollection = {
  params: Joi.object().keys({
    merchantId: Joi.string().hex().length(24), // Assuming `collectionId` is a string representing the collection ID
  }),
};

const getCollectionById = {
  params: Joi.object().keys({
    collectionId: Joi.string().required(), // Assuming `collectionId` is a string representing the collection ID
  }),
};

const updateCollection = {
  params: Joi.object().keys({
    collectionId: Joi.string().required(), // Assuming `collectionId` is a string representing the collection ID
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      user: Joi.string(), // Assuming `user` is a string representing the user ID
    })
    .min(1),
};

const deleteCollection = {
  params: Joi.object().keys({
    collectionId: Joi.string().required(), // Assuming `collectionId` is a string representing the collection ID
  }),
};

module.exports = {
  createCollection,
  getCollection,
  getCollectionById,
  updateCollection,
  deleteCollection,
};

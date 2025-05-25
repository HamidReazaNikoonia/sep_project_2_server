const Joi = require('joi');

const createOrder = {
  body: Joi.object().keys({
    customer: Joi.string().required(),
    products: Joi.array()
      .items(
        Joi.object().keys({
          product: Joi.string().hex().length(24).required(),
          quantity: Joi.number().min(1).required(),
        })
      )
      .required(),
    paymentMethod: Joi.string().required(),
    billingAddress: Joi.object({
      addressLine1: Joi.string().required(),
      addressLine2: Joi.string().allow(''),
      city: Joi.string().required(),
      state: Joi.string().required(),
      postalCode: Joi.string().required(),
      country: Joi.string(),
    }),
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
  createOrder,
  getCollection,
  getCollectionById,
  updateCollection,
  deleteCollection,
};

const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Collection } = require('../product.model');
const ApiError = require('../../../../utils/ApiError');

const { ObjectId } = mongoose.Types;

const createCollection = async ({ collectionData }) => {
  const collection = new Collection(collectionData);
  await collection.save();
  return collection;
};

const getAllCollection = async () => {
  const collection = await Collection.find();

  if (!collection) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Collection Not Found');
  }

  return collection;
};

const getCollectionById = async (collectionId) => {
  if (!ObjectId.isValid(collectionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Collection ID');
  }

  const collection = await Collection.findById(collectionId);

  if (!collection) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Collection Not Found');
  }

  return collection;
};

const updateCollection = async (collectionId, updateData) => {
  if (!ObjectId.isValid(collectionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Collection ID');
  }

  const collection = await Collection.findByIdAndUpdate(collectionId, updateData, { new: true });

  if (!collection) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Collection Not Found');
  }

  return collection;
};

const deleteCollection = async (collectionId) => {
  if (!ObjectId.isValid(collectionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Collection ID');
  }

  const collection = await Collection.findByIdAndDelete(collectionId);

  if (!collection) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Collection Not Found');
  }

  return collection;
};

module.exports = {
  createCollection,
  getAllCollection,
  getCollectionById,
  updateCollection,
  deleteCollection,
};

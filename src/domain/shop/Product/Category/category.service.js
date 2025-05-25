const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Category } = require('../product.model');
const ApiError = require('../../../../utils/ApiError');

const { ObjectId } = mongoose.Types;

const createCategory = async (Data) => {
  const category = new Category(Data);
  await category.save();
  return category;
};

const getCategories = async () => {
  const category = await Category.find();

  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category Not Found');
  }

  return category;
};

const deleteCategoryById = async (collectionId) => {
  if (!ObjectId.isValid(collectionId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Collection ID');
  }

  const collection = await Category.findByIdAndDelete(collectionId);

  if (!collection) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Collection Not Found');
  }

  return collection;
};

module.exports = {
  createCategory,
  getCategories,
  deleteCategoryById,
};

const httpStatus = require('http-status');

const catchAsync = require('../../../../utils/catchAsync');
const collectionService = require('./category.service');

const createCategory = catchAsync(async (req, res) => {
  const category = await collectionService.createCategory(req.body);
  res.status(httpStatus.CREATED).send(category);
});

const getCategories = catchAsync(async (req, res) => {
  const category = await collectionService.getCategories();
  res.status(httpStatus.OK).send(category);
});

const deleteCategory = catchAsync(async (req, res) => {
  const { categoryId } = req.params;
  await collectionService.deleteCategoryById(categoryId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createCategory,
  getCategories,
  deleteCategory,
};

const httpStatus = require('http-status');
const ApiError = require('../../../utils/ApiError');
const catchAsync = require('../../../utils/catchAsync');

// Model
const Category = require('./category.model');

const createCategory = catchAsync(async (req, res) => {
  const { name, parent } = req.body;

  // Check if category already exists
  if (await Category.isNameTaken(name)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category name already taken');
  }

  // If parent is provided, validate it exists
  if (parent) {
    const parentCategory = await Category.findById(parent);
    if (!parentCategory) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Parent category not found');
    }
  }

  const category = await Category.create({ name, parent });
  res.status(httpStatus.CREATED).send(category);
});

const getCategoryTree = catchAsync(async (req, res) => {
  const tree = await Category.buildTree();
  res.send(tree);
});

const getCategoryById = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }

  // Get all children (entire subtree)
  const descendants = await Category.find({ path: { $regex: category._id } });

  res.send({
    ...category.toObject(),
    descendants,
  });
});

module.exports = {
  createCategory,
  getCategoryTree,
  getCategoryById,
};

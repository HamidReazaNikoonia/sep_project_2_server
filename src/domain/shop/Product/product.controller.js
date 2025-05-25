const httpStatus = require('http-status');

// const ApiError = require('../utils/ApiError');
const catchAsync = require('../../../utils/catchAsync');
const productService = require('./product.service');
const ApiError = require('../../../utils/ApiError');
const pick = require('../../../utils/pick');

/** **************************  Admin ***************************************** */
const getAllProductsForAdmin = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const filter = pick(req.query, ['title', 'subtitle', 'q', '_id']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await productService.getAllProductForAdmin({ filter, options });
  res.status(httpStatus.OK).send(result);
});

const createProduct = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const newProduct = await productService.createProduct({ product: req.body});
  res.status(httpStatus.CREATED).send(newProduct);
});

const updateProduct = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const { productId } = req.params;
  const updatedProduct = await productService.updateProduct({ productId, productData: req.body });
  res.status(httpStatus.OK).send(updatedProduct);
});


const deleteProduct = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const { productId } = req.params;
  await productService.deleteProduct({ productId });
  res.status(httpStatus.NO_CONTENT).send();
});

/** **************************************************************************************** */



/** **************************  Public  ***************************************** */
const getAllProducts = catchAsync(async (req, res) => {
  const result = await productService.getAllProduct({ query: req.query });
  res.status(httpStatus.OK).send(result);
});

const getProductReview = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { page } = req.query;

  const result = await productService.getProductReview({ productId, page });
  res.status(httpStatus.OK).send(result);
});

const createProductReview = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { name, text, rating } = req.body;

  const result = await productService.createProductReview({ productId, name, text, rating });
  res.status(httpStatus.OK).send(result);
});

const getProductBySlug = catchAsync(async (req, res) => {
  const { productId, slug } = req.params;
  const product = await productService.getProductBySlug({ productId, slug });
  res.status(httpStatus.OK).send(product);
});



module.exports = {
  getAllProducts,
  getProductReview,
  createProductReview,
  getAllProductsForAdmin,
  getProductBySlug,
  createProduct,
  deleteProduct,
  updateProduct,
};

const express = require('express');
// const auth = require('../../middlewares/auth');

// const userValidation = require('../../validations/user.validation');
// const userController = require('../../controllers/user.controller');
const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');
const productController = require('./product.controller');
const productValidation = require('./product.validation');

const collectionController = require('./Collection/collection.controller');
const collectionValidation = require('./Collection/collection.validation');

const categoryController = require('./Category/category.controller');

const adminRouter = express.Router();
const publicRouter = express.Router();

/** **************************  Public Route  ***************************************** */
publicRouter.route('/').get(productController.getAllProducts);
// get All Collections
publicRouter.route('/collection').get(collectionController.getAllCollection);

// get Collections By Collection Id
publicRouter.route('/collection/:collectionId').get(collectionController.getCollectionById);

// Get All Categories
publicRouter.route('/categories').get(categoryController.getCategories);
publicRouter.route('/:productId/:slug').get(productController.getProductBySlug);

publicRouter
  .route('/:productId/:slug/review')
  .get(productController.getProductReview)
  .post(productController.createProductReview);

/** ********************************************************************************** */

/** **************************  Admin Route  ***************************************** */
//
adminRouter
  .route('/')
  .get(auth(), productController.getAllProductsForAdmin)
  .post(auth(), validate(productValidation.createProduct), productController.createProduct);

adminRouter
  .route('/:productId')
  .patch(auth(), validate(productValidation.updateProduct), productController.updateProduct)
  .delete(auth(), productController.deleteProduct);

/** Collection Routes */
adminRouter
  .route('/collection')
  .post(auth(), validate(collectionValidation.createCollection), collectionController.createCollection);

adminRouter
  .route('/collection/:collectionId')
  .get(validate(collectionValidation.getCollectionById), collectionController.getCollectionById)
  .patch(auth(), validate(collectionValidation.updateCollection), collectionController.updateCollection)
  .delete(auth(), validate(collectionValidation.deleteCollection), collectionController.deleteCollection);

/** Category Routes */

adminRouter.route('/categories').post(auth(), categoryController.createCategory);

adminRouter.route('/categories/:categoryId').delete(auth(), categoryController.deleteCategory);

module.exports = { adminRouter, publicRouter };

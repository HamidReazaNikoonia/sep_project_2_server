const express = require('express');

const auth = require('../../../middlewares/auth');
const validate = require('../../../middlewares/validate');

const { addProductToCartValidation, removeProductFromCart, removeCourseFromCart } = require('./cart.validate');

const cartController = require('./cart.controller.js');

const cartRouter = express.Router();

cartRouter
  .route('/')
  .post(auth(), validate(addProductToCartValidation), cartController.addProductToCart)
  .get(auth(), cartController.getLoggedUserCart);


  // cartRouter
  // .route('course/:courseId')
  // // this DELETE route use `productId` params as cart item _id
  // // productId param ===> cart.cartItem._id
  // .delete(auth(), validate(removeProductFromCart), cartController.removeCourseFromCart);
  // // // this PUT route use `productId` as product id
  // // .put(auth(), cartController.updateProductQuantity);


cartRouter
  .route('/:cartItemId')
  // this DELETE route use `productId` params as cart item _id
  // productId param ===> cart.cartItem._id
  .delete(auth(), validate(removeProductFromCart), cartController.removeProductFromCart)
  // this PUT route use `productId` as product id
  .put(auth(), cartController.updateProductQuantity);

module.exports = cartRouter;



/**
 * @swagger
 * tags:
 *   name: Cart
 *   description: Cart route
 */

/**
 * @swagger
 * /cart:
 *   post:
 *     summary: add new item (Product) to the cart if cart exist or create new cart
 *     tags: [Cart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Item Added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   $ref: '#/components/schemas/AuthTokens'
 *       "400":
 *         $ref: '#/components/responses/DuplicateEmail'
 */

/* eslint-disable no-restricted-syntax */
const mongoose = require('mongoose');
const httpStatus = require('http-status');

// utils
const ApiError = require('../../../utils/ApiError');

// Model
const cartModel = require('./cart.model');
const {Product: ProductModel} = require('./../Product/product.model');

function calcTotalPrice(cart) {
  let totalPrice = 0;
  cart.cartItem.forEach((element) => {
    // console.log('element');
    // console.log(element);
    totalPrice += element.quantity * element.price;
  });

  // eslint-disable-next-line no-param-reassign
  cart.totalPrice = totalPrice;

  return totalPrice;
}


const addCourseToCart = async ({ course, userId }) => {
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid course ID');
  }

  let isCartExist = await cartModel.findOne({
    userId: userId,
  });

  const coursePrice = course.price_discount || course.price_real;

  // If user have not Cart in the DB
  // we will create new Cart for the User
  if (!isCartExist) {
    let newCart = new cartModel({
      userId,
      cartItem: [{ courseId: course._id, quantity: 1, price: coursePrice }],
      totalPrice: coursePrice,
    });
    await newCart.save();

    return newCart;
  }

  // else, if cart existed
  // we will update Cart and add new item
  // then calculate new total price

  // check, if new item exist in Cart or not
  let item = isCartExist.cartItem.find((element) => {
    return element?.courseId?._id.toString() == course._id?.toString();
  });


  if (item) {
    throw new ApiError(httpStatus.ALREADY_REPORTED, 'This course exist in the cart already');
  }

  // this course not exist in the Cart

    isCartExist.cartItem.push({ courseId: course._id, quantity: 1, price: coursePrice });

    calcTotalPrice(isCartExist);

    await isCartExist.save();

    return isCartExist;
};

const addProductToCart = async ({ product, quantity, userId }) => {
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invalid Product ID');
  }

  let isCartExist = await cartModel.findOne({
    userId: userId,
  });

  let actualPrice;
  // check if product is `is_fire_sale == true`, then calculate price
  const isFireSalePrice = product.is_fire_sale;

  if (isFireSalePrice) {
    actualPrice = product.price_discount ||  product.price_real;
  } else {
    actualPrice = product.price_real;
  }

  // If user have not Cart in the DB
  // we will create new Cart for the User
  if (!isCartExist) {
    // eslint-disable-next-line new-cap
    let newCart = new cartModel({
      userId,
      cartItem: [{ productId: product._id, quantity, price: actualPrice * quantity }],
      totalPrice: actualPrice * quantity,
    });
    await newCart.save();

    return newCart;
  }

  // else, if cart existed
  // we will update Cart and add new item
  // then calculate new total price

  // check, if new item exist in Cart or not
  let item = isCartExist.cartItem.find((element) => {
    return element.productId == product._id?.toString();
  });

  console.log('item');
  console.log(item);

  if (item) {
    item.quantity += quantity || 1;
  } else {
    isCartExist.cartItem.push({ productId: product._id, quantity, price: actualPrice * quantity });
  }
  calcTotalPrice(isCartExist);

  await isCartExist.save();

  return isCartExist;
};

const getLoggedUserCart = async ({ userId }) => {
  const cartItems = await cartModel.findOne({ userId }).populate('cartItem.productId').populate('cartItem.courseId');
  return cartItems;
};


const removeProductFromCart = async ({cartItemId, userId}) => {
  // let result = await cartModel.findOneAndUpdate(
  //   { userId, },
  //   { $pull: { cartItem: { _id: cartItemId } } },
  //   { new: true }
  // );

  const result = await cartModel.findOneAndUpdate(
    { userId },
    [
      {
        $set: {
          cartItem: {
            $filter: {
              input: "$cartItem",
              as: "item",
              cond: { $ne: ["$$item._id", mongoose.Types.ObjectId(cartItemId)] }
            }
          }
        }
      },
      {
        $set: {
          totalPrice: {
            $sum: {
              $map: {
                input: "$cartItem",
                as: "item",
                in: { $multiply: ["$$item.price", "$$item.quantity"] }
              }
            }
          }
        }
      }
    ],
    { new: true } // Return the updated document
  );

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Item was not found");
  }


  // calcTotalPrice(result);

  return result;
}


const updateProductQuantity = async ({productId, userId, quantity}) => {
  const product = await ProductModel.findById(productId);


  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product was not found");
  }

  let isCartExist = await cartModel.findOne({ userId });

  let item = isCartExist.cartItem.find((elm) => elm.productId == productId);
  if (item) {
    item.quantity = quantity;
  }
  calcTotalPrice(isCartExist);


  await isCartExist.save();

  return isCartExist;
}

module.exports = { addProductToCart, getLoggedUserCart, removeProductFromCart, updateProductQuantity, addCourseToCart };

const httpStatus = require('http-status');
const catchAsync = require('../../../utils/catchAsync');
const pick = require('../../../utils/pick');

// services
const orderService = require('./order.service');
const addressService = require('./address.service');

// utils
const ApiError = require('../../../utils/ApiError');

// config
const config = require('../../../config/config');

/**
 * Asynchronous controller function to retrieve all orders for Admin.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *   @property {Object} query - Query parameters for filtering or pagination (optional).
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws a 404 error if the user does not exist in the request object.
 *
 * @returns {void} - Sends a response with the retrieved orders data.
 */
const getAllOrders = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const filter = pick(req.query, [
    'order_status',
    'payment_status',
    'transaction_id',
    'order_id',
    'reference',
    'customer_id',
    'customer',
    'created_from_date',
    'created_to_date',
    'updated_from_date',
    'updated_to_date',
    // New filters
    'have_product',
    'have_course',
    'have_coupon',
    'have_discount',
    'have_shipping',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await orderService.getAllOrders({ filter, options });
  res.status(httpStatus.OK).send(result);
});

/**
 * Asynchronous controller function to retrieve all User orders for the authenticated user.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *   @property {Object} query - Query parameters for filtering or pagination (optional).
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws a 404 error if the user does not exist in the request object.
 *
 * @returns {void} - Sends a response with the retrieved orders data.
 */
const getAllUserOrders = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const result = await orderService.getAllUsersOrders({ query: req.query, user: req.user });
  res.status(httpStatus.OK).send(result);
});

/**
 * Asynchronous controller function to retrieve a specific order for Admni by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `orderId`.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the retrieved order data.
 */
const getOrderById = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const order = await orderService.getOrderById({ orderId });
  res.status(httpStatus.OK).send(order);
});

/**
 * Asynchronous controller function to retrieve a specific Authenticated user order by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `orderId`.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the retrieved order data.
 */
const getUserOrderById = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }
  const { orderId } = req.params;
  const order = await orderService.getUserOrderById({ orderId, user: req.user });
  res.status(httpStatus.OK).send(order);
});

/**
 * Asynchronous controller function to create a new order for the authenticated user.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *   @property {Object} body - Request body data, expected to contain the order details.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws a 404 error if the user does not exist in the request object.
 *
 * @returns {void} - Sends a response with the newly created order data.
 */
const createOrderForAdmin = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  if (req.user && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'You Are Not Authorized To Access This Resource');
  }

  const newOrder = await orderService.createOrderForAdmin({ orderData: req.body, user: req.user });
  res.status(httpStatus.CREATED).send(newOrder);
});

/**
 * Asynchronous controller function to create a new order for the authenticated user.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *   @property {Object} body - Request body data, expected to contain the order details.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws a 404 error if the user does not exist in the request object.
 *
 * @returns {void} - Sends a response with the newly created order data.
 */
const createOrderByUser = catchAsync(async (req, res) => {
  const { cartId, shippingAddress, couponCodes = [], useUserWallet = false } = req.body;

  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  } else if (!cartId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart Not Defined In Request Body');
  }

  const newOrder = await orderService.createOrderByUser({
    cartId,
    user: req.user,
    shippingAddress,
    couponCodes,
    useUserWallet,
  });
  res.status(httpStatus.CREATED).send(newOrder);
});

const calculateOrderSummaryForAdmin = catchAsync(async (req, res) => {
  const { items, couponCodes = [] } = req.body;

  if (!items || items.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Items Not Defined In Request Body');
  }

  if (req.user && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'You Are Not Authorized To Access This Resource');
  }

  const summary = await orderService.calculateOrderSummaryForAdmin({ items, couponCodes });
  res.status(httpStatus.OK).send(summary);
});

const calculateOrderSummary = catchAsync(async (req, res) => {
  const { cartId, couponCodes = [] } = req.body;

  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  } else if (!cartId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Cart Not Defined In Request Body');
  }

  const summary = await orderService.calculateOrderSummary({ cartId, couponCodes });
  res.status(httpStatus.OK).send(summary);
});

/**
 * *** Admin ***
 * Asynchronous controller function to update an existing order by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `orderId`.
 *   @property {Object} body - Request body data, expected to contain the updated order details.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the updated order data.
 */
const updateOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const updatedOrder = await orderService.updateOrder({ orderId, orderData: req.body });
  res.status(httpStatus.OK).send(updatedOrder);
});

/**
 * *** Admin ***
 * Asynchronous controller function to delete an existing order by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `orderId`.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - void
 */
const deleteOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  await orderService.deleteOrder({ orderId });
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * *** Authenticated User ***
 * Asynchronous controller function to checkout order by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `orderId`.
 *   @property {Object} body - Request body data, expected to contain the updated order details.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the updated order data.
 */
const checkoutOrder = catchAsync(async (req, res) => {
  const { orderId } = req.params;
  const {Authority, Status} = req.query;


  if (Status !== "OK") {
    return res.redirect(`${config.CLIENT_URL}/checkout?order_id=${orderId}&payment_status=false`);

  }


  const updatedOrder = await orderService.checkoutOrder({ orderId, Authority, Status });



    // navigate user to the Application with query params
    // Query params => order_id, transaction_id, payment_status

    // checkoutOrder (updatedOrder variable) return
    // {order, transaction, payment}



    if (!updatedOrder?.order?._id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Bad Request');
    }

    // return res.status(httpStatus.OK).send(updatedOrder);

  res.redirect(`${config.CLIENT_URL}/checkout?order_id=${updatedOrder?.order?._id}&payment_status=${updatedOrder.order?.paymentStatus}`);

  // res.status(httpStatus.OK).send(updatedOrder);
});

const createAddressByUser = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const newAddress = await addressService.createNewAddressByUser({ customerId: req.user?.id, newAddress: req.body });
  res.status(httpStatus.OK).send(newAddress);
});

const getAllUserAddress = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const newAddress = await addressService.getAllUserAddress({ customerId: req.user?.id });
  res.status(httpStatus.OK).send(newAddress);
});

const updateUserAddress = catchAsync(async (req, res) => {
  const { shippingAddressId } = req.params;
  const updatedAddress = req.body;
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }


  const newAddress = await addressService.updateUserAddress({ customerId: req.user?.id, shippingAddressId, updatedAddress });
  res.status(httpStatus.OK).send(newAddress);
});

module.exports = {
  getAllOrders,
  getOrderById,
  getUserOrderById,
  getAllUserOrders,
  createOrderForAdmin,
  updateOrder,
  deleteOrder,
  createOrderByUser,
  checkoutOrder,
  calculateOrderSummary,
  calculateOrderSummaryForAdmin,
  // address
  createAddressByUser,
  getAllUserAddress,
  updateUserAddress,
};

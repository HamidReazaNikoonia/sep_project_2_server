const httpStatus = require('http-status');

const catchAsync = require('../../../../utils/catchAsync');
const ApiError = require('../../../../utils/ApiError');
const collectionService = require('./collection.service');

/**
 * Asynchronous function to create a new collection for the authenticated user.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object, which contains:
 *   @property {Object} user - The authenticated user information.
 *   @property {Object} body - Request body data, expected to contain the collection data.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws a 404 error if the user does not exist in the request object.
 *
 * @returns {void} - Sends a response with the created collection object.
 */

const createCollection = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const collection = await collectionService.createCollection({ collectionData: req.body });
  res.status(httpStatus.CREATED).send(collection);
});
/** ******************************************************************* */


/**
 * Asynchronous function to retrieve all collections.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object (not used in this function).
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the retrieved collection data.
 */
const getAllCollection = catchAsync(async (req, res) => {
  const collection = await collectionService.getAllCollection();
  res.status(httpStatus.OK).send(collection);
});
/** ******************************************************************* */


/**
 * Asynchronous function to retrieve a collection by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `collectionId`.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the retrieved collection data.
 */
const getCollectionById = catchAsync(async (req, res) => {
  const { collectionId } = req.params;
  const collection = await collectionService.getCollectionById(collectionId);
  res.status(httpStatus.OK).send(collection);
});


/**
 * Asynchronous function to update a collection by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `collectionId`.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the retrieved collection data.
 */
const updateCollection = catchAsync(async (req, res) => {
  const { collectionId } = req.params;
  const collection = await collectionService.updateCollection(collectionId, req.body);
  res.status(httpStatus.OK).send(collection);
});


/**
 * Asynchronous function to delete a collection by its unique ID.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} params - Request parameters, expected to contain `collectionId`.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @returns {void} - Sends a response with the retrieved collection data.
 */
const deleteCollection = catchAsync(async (req, res) => {
  const { collectionId } = req.params;
  await collectionService.deleteCollection(collectionId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createCollection,
  getAllCollection,
  getCollectionById,
  updateCollection,
  deleteCollection,
};

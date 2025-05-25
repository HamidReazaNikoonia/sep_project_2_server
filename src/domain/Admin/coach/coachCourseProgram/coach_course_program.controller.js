const httpStatus = require('http-status');
const mongoose = require('mongoose');
const catchAsync = require('../../../../utils/catchAsync');

// model
const coachCourseProgramModel = require('./coach_course_program.model');

// utils
const ApiError = require('../../../../utils/ApiError');
const videoFileValidationHandler = require('./video_file_validation_handler.helper');

/**
 * Asynchronous controller function to retrieve all steps of access level.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws a 404 error if the user does not exist in the request object.
 *
 * @returns {void} - Sends a response with the retrieved orders data.
 */
const getAllAcessLevel = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const result = await coachCourseProgramModel.find(req.query);
  res.status(httpStatus.OK).send(result);
});

/**
 * Asynchronous controller function to create access level.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws a 404 error if the user does not exist in the request object.
 *
 * @returns {void} - Sends a response with the retrieved orders data.
 */
const implementAccessLevel = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  // request body POST-Validation

  // check if course_object is not array
  if (!Array.isArray(req.body.course_object)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course Object Not Valid Array ');
  }

  // check if course_object is empty Array
  if (req.body.course_object.length === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course Object is Empty Array ');
  }

  // check if course_subject_count is equal with course_object.length
  if (req.body.course_object.length !== req.body.course_subject_count) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Course Object count not valid');
  }

  // check for video file uploaded
  const VideoFileValidation = await videoFileValidationHandler(req.body.course_object);

  if (!VideoFileValidation) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Course Object Video File Validation Faild');
  }

  const requestBody = {
    title: req.body.title,
    description: req.body.description,
    amount: req.body.amount,
    is_have_penalty: req.body.is_have_penalty,
    course_subject_count: req.body.course_subject_count,
    createdBy: req.user.id,
    isPublished: req.body.isPublished === undefined ? true : req.body.isPublished,
    course_object: req.body.course_object || [],
  };

  if (req.body.is_have_penalty) {
    requestBody.penalty_fee = req.body.penalty_fee;
  }

  // check if data exist
  const programDataInServer = await coachCourseProgramModel.findOne({ title: req.body.title });

  // we have access level with this title
  if (programDataInServer) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'we have access level with this title');
  }

  const result = await coachCourseProgramModel.create(requestBody);

  res.status(httpStatus.OK).send(result);
});

/**
 * Asynchronous controller function to update access level.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *   @property {Object} params - Route parameters containing the program ID.
 *   @property {Object} body - Request body with update data.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws appropriate errors for various validation failures.
 *
 * @returns {void} - Sends a response with the updated access level data.
 */
const updateAccessLevel = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  // Validate program ID
  if (!mongoose.Types.ObjectId.isValid(req.params.programId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid program ID');
  }

  // Check if program exists
  const existingProgram = await coachCourseProgramModel.findById(req.params.programId);
  if (!existingProgram) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Access level not found');
  }

  // Initialize update object
  const updateData = {
    updatedAt: new Date(),
  };

  // Optional field updates
  if (req.body.title !== undefined) {
    // Check if new title already exists (excluding current document)
    const titleExists = await coachCourseProgramModel.findOne({
      title: req.body.title,
      _id: { $ne: req.params.programId },
    });

    if (titleExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'An access level with this title already exists');
    }

    updateData.title = req.body.title;
  }

  if (req.body.description !== undefined) {
    updateData.description = req.body.description;
  }

  if (req.body.amount !== undefined) {
    updateData.amount = req.body.amount;
  }

  if (req.body.is_have_penalty !== undefined) {
    updateData.is_have_penalty = req.body.is_have_penalty;

    // Validate penalty fee if penalty is enabled
    if (req.body.is_have_penalty && req.body.penalty_fee === undefined) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Penalty fee is required when penalty is enabled');
    }
  }

  if (req.body.penalty_fee !== undefined) {
    if (req.body.is_have_penalty === false && req.body.penalty_fee > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot set penalty fee when penalty is disabled');
    }
    updateData.penalty_fee = req.body.penalty_fee;
  }

  if (req.body.isPublished !== undefined) {
    updateData.isPublished = req.body.isPublished;
  }

  // Handle course object updates
  if (req.body.course_object !== undefined) {
    if (!Array.isArray(req.body.course_object)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Course Object must be an array');
    }

    if (req.body.course_object.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Course Object cannot be empty');
    }

    // Validate course subject count if provided
    if (req.body.course_subject_count !== undefined && req.body.course_object.length !== req.body.course_subject_count) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Course Object count does not match course_subject_count');
    }

    // Validate video files
    await videoFileValidationHandler(req.body.course_object);

    updateData.course_object = req.body.course_object;

    // Update course subject count if not explicitly provided
    updateData.course_subject_count =
      req.body.course_subject_count !== undefined ? req.body.course_subject_count : req.body.course_object.length;
  }

  // Perform the update
  const updatedProgram = await coachCourseProgramModel.findByIdAndUpdate(req.params.programId, updateData, {
    new: true,
    runValidators: true,
  });

  res.status(httpStatus.OK).send(updatedProgram);
});

/**
 * Asynchronous controller function to update access level.
 * Wrapped with `catchAsync` to handle any potential errors in asynchronous calls.
 *
 * @param {Object} req - Express request object containing:
 *   @property {Object} user - The authenticated user information.
 *   @property {Object} params - Route parameters containing the program ID.
 *   @property {Object} body - Request body with update data.
 *
 * @param {Object} res - Express response object used to send responses back to the client.
 *
 * @throws {ApiError} - Throws appropriate errors for various validation failures.
 *
 * @returns {void} - Sends a response with the updated access level data.
 */
const deleteAccessLevel = catchAsync(async (req, res) => {
  const { programId } = req.params;

  const accessLevelProgram = await coachCourseProgramModel.findByIdAndDelete(programId);

  if (!accessLevelProgram) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Access Level Not Exist in DB');
  }

  res.status(httpStatus.OK).json({
    status: 'success',
    message: 'Coach course program deleted successfully',
  });
});

module.exports = { getAllAcessLevel, implementAccessLevel, updateAccessLevel, deleteAccessLevel };

//   Object.assign(programDataInServer, req.body);
//   result = await programDataInServer.save();

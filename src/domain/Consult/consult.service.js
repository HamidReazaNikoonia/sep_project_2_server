const { ObjectID } = require('mongoose');
const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');

// Models
const Consult = require('./consult.model');

// utils
const ApiError = require('../../utils/ApiError');

// const pick = require('../../utils/pick');
// const ApiError = require('../../utils/ApiError');
// const catchAsync = require('../../utils/catchAsync');
const APIFeatures = require('../../utils/APIFeatures');

const createConsult = async ({ body }) => {
  const consult = new Consult(body);
  const savedConsult = await consult.save();

  if (!savedConsult) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Consult Could Not Be Save');
  }

  return savedConsult;
};

const getSpecificConsult = async ({ id }) => {
  const specificConsult = await Consult.findById(id);

  if (!specificConsult) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Consult Could Not Exist');
  }

  return { consult: specificConsult };
};

module.exports = {
  createConsult,
  getSpecificConsult,
};

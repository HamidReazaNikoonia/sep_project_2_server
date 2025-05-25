const httpStatus = require('http-status');
const config = require('../../config/config');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');

const searchService = require('./search.service');



const generalSearch = catchAsync(async (req, res) => {
  const result = await searchService.generalSearch({ query: req.query });
  res.status(httpStatus.OK).send(result);
});


module.exports = {
  generalSearch
};

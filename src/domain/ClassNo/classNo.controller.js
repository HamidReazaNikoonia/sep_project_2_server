const httpStatus = require('http-status');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const classNoService = require('./classNo.service');

const createClassNo = catchAsync(async (req, res) => {
  const classNo = await classNoService.createClassNo(req.body);
  res.status(httpStatus.CREATED).send(classNo);
});

const getAllClassNos = catchAsync(async (req, res) => {
  const classNos = await classNoService.getAllClassNos();
  res.send(classNos);
});

const deleteClassNo = catchAsync(async (req, res) => {
  const deleted = await classNoService.deleteClassNoById(req.params.classNoId);
  if (!deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Class not found');
  }
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createClassNo,
  getAllClassNos,
  deleteClassNo,
};

const httpStatus = require('http-status');
const config = require('../../config/config');
// const ApiError = require('../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const referenceService = require('./reference.service');
const ApiError = require('../../utils/ApiError');

const getAllReference = catchAsync(async (req, res) => {
  const result = await referenceService.getAllReference({ query: req.query });
  res.status(httpStatus.OK).send(result);
});

const getAllUserReference = catchAsync(async (req, res) => {
  if (req.user.id !== req.params.user_id) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User Not Allow This resource (User id Req params not the same with Req user id)'
    );
  }
  const result = await referenceService.getAllReference({ query: { customer: req.user.id } });
  res.status(httpStatus.OK).send(result);
});

const getSpecificReference = catchAsync(async (req, res) => {
  const result = await referenceService.getSpecificReference({
    customer: req.user.id,
    reference_id: req.params.reference_id,
  });
  res.status(httpStatus.OK).send(result);
});

/**
 *  Consult Step 2
 * we will create Reference Model
 *
 * @param req.body => consult Id
 * @param req.body => slot-time
 * @param req.body => ref_type
 * @param req.user => customer
 *
 */
const createReference = catchAsync(async (req, res) => {
  // Get Slot-time and ref_type

  const referenceBody = {
    customer: req.user.id,
    consultId: req.body.consultId,
    ref_type: req.body.ref_type,
    consultant_dr_id: req.body.consultant_dr_id,
  };

  const newReference = await referenceService.createReference({ referenceBody });
  res.status(httpStatus.CREATED).send(newReference);
});

const verifyPaymentForReference = catchAsync(async (req, res) => {
  // Get Slot-time and ref_type

  const authorities = req.query.Authority;
  const paymentStatusFromQuery = req.query.Status;

  if (paymentStatusFromQuery !== 'OK') {
    res.redirect(`${config.CLIENT_URL}/dashboard/payment-result?refid=0&payment_status=false`);
    return false;
    // throw new ApiError(httpStatus.BAD_REQUEST, 'Payment Status Fail from Bank');
  }

  const referenceBody = {
    authority: authorities,
  };

  const newReference = await referenceService.verifyPaymentForReference({ referenceBody });
  res.redirect(
    `${config.CLIENT_URL}/dashboard/payment-result?refid=${
      newReference.referenceDoc._id
    }&payment_status=${newReference.referenceDoc.payment_status.toString()}`
  );
  // res.status(httpStatus.CREATED).send(newReference);
});

const implementSession = catchAsync(async (req, res) => {
  const { reference_id } = req.params;
  const { time_slot_id, ref_type, consult_reason } = req.body;

  // Get Reference From DB
  const referenceDoc = await referenceService.getSpecificReference({ reference_id, customer: req.user.id });

  if (!referenceDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Reference Not Exist In DB');
  }

  // check if payment status is true (in reference doc)
  if (!referenceDoc.payment_status) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment Not Done');
  }

  // check reference Status
  if (referenceDoc.status === 'RESOLVE') {
    throw new ApiError(httpStatus.NOT_FOUND, 'Reference Resolved');
  }

  const updatedReference = await referenceService.updateAndImplementTimeForReference({
    consult_reason,
    ref_type,
    time_slot_id,
    reference_id,
  });

  // Get Time-Slot Id form user

  // Send SMS to User
  // Send SMS and email to Admin
  // create reference_code code rahgiri

  res.status(httpStatus.OK).send(updatedReference);
});

module.exports = {
  getAllReference,
  getAllUserReference,
  getSpecificReference,
  verifyPaymentForReference,
  implementSession,
  createReference,
};

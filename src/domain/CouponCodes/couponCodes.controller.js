const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const couponCodeService = require('./couponCodes.service');

const createCouponCode = catchAsync(async (req, res) => {
  const coupon = await couponCodeService.createCouponCode(req.body, req.user.id);
  res.status(httpStatus.CREATED).send(coupon);
});

const getCouponCodes = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['code', 'type', 'is_active']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await couponCodeService.queryCouponCodes(filter, options);
  res.send(result);
});

const getCouponCode = catchAsync(async (req, res) => {
  const coupon = await couponCodeService.getCouponCodeById(req.params.couponId);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon code not found');
  }
  res.send(coupon);
});

const updateCouponCode = catchAsync(async (req, res) => {
  const coupon = await couponCodeService.updateCouponCodeById(req.params.couponId, req.body);
  res.send(coupon);
});

const deleteCouponCode = catchAsync(async (req, res) => {
  await couponCodeService.deleteCouponCodeById(req.params.couponId);
  res.status(httpStatus.NO_CONTENT).send();
});

const validateCoupon = catchAsync(async (req, res) => {
  const { code, price, courseId } = req.body;

  if (!code || !price) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Code and price are required');
  }

  const result = await couponCodeService.validateAndApplyCoupon(code, price, courseId);
  res.send(result);
});

const applyCoupon = catchAsync(async (req, res) => {
  const { code, price, courseId } = req.body;

  if (!code || !price) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Code and price are required');
  }

  // Get the coupon
  const coupon = await couponCodeService.getCouponCodeByCode(code);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon code not found');
  }

  // Validate and apply
  const result = await couponCodeService.validateAndApplyCoupon(code, price, courseId);

  // Mark as used
  await coupon.use();

  res.send({
    ...result,
    message: 'Coupon applied successfully',
  });
});

const generateReferralCode = catchAsync(async (req, res) => {
  // Assuming user is authenticated and userId is available in req.user.id
  if (!req.user || !req.user.id) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User must be authenticated');
  }

  const couponDetails = pick(req.body, [
    'discount_type',
    'discount_value',
    'max_uses',
    'valid_until',
    'min_purchase_amount',
    'applicable_courses',
  ]);

  const referralCode = await couponCodeService.generateReferralCode(req.user.id, couponDetails);
  res.status(httpStatus.CREATED).send(referralCode);
});

module.exports = {
  createCouponCode,
  getCouponCodes,
  getCouponCode,
  updateCouponCode,
  deleteCouponCode,
  validateCoupon,
  applyCoupon,
  generateReferralCode,
};

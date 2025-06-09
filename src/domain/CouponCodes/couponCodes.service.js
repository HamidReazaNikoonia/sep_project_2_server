const httpStatus = require('http-status');
// eslint-disable-next-line import/no-extraneous-dependencies
const { CouponJS } = require('couponjs');
const ApiError = require('../../utils/ApiError');
const CouponCode = require('./couponCodes.model');

/**
 * Create a coupon code
 * @param {Object} couponBody
 * @returns {Promise<CouponCode>}
 */
const createCouponCode = async (couponBody, userId) => {
  const coupon = new CouponJS();
  const generatedCode = coupon.generate();

  // Check if coupon code already exists
  const existingCoupon = await CouponCode.findOne({ code: generatedCode });
  if (existingCoupon) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
  }

  const couponProp = {
    ...couponBody,
    code: generatedCode,
    created_by: userId,
  };

  return CouponCode.create(couponProp);
};

/**
 * Query for coupon codes
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryCouponCodes = async (filter, options) => {
  const coupons = await CouponCode.paginate(filter, options);
  return coupons;
};

/**
 * Get coupon code by id
 * @param {ObjectId} id
 * @returns {Promise<CouponCode>}
 */
const getCouponCodeById = async (id) => {
  return CouponCode.findById(id);
};

/**
 * Get coupon code by code
 * @param {string} code
 * @returns {Promise<CouponCode>}
 */
const getCouponCodeByCode = async (code) => {
  return CouponCode.findOne({ code: code.toUpperCase() });
};

/**
 * Update coupon code by id
 * @param {ObjectId} couponId
 * @param {Object} updateBody
 * @returns {Promise<CouponCode>}
 */
const updateCouponCodeById = async (couponId, updateBody) => {
  const coupon = await getCouponCodeById(couponId);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon code not found');
  }

  if (updateBody.code && updateBody.code !== coupon.code) {
    const existingCoupon = await CouponCode.findOne({ code: updateBody.code.toUpperCase() });
    if (existingCoupon) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
    }
  }

  Object.assign(coupon, updateBody);
  await coupon.save();
  return coupon;
};

/**
 * Delete coupon code by id
 * @param {ObjectId} couponId
 * @returns {Promise<CouponCode>}
 */
const deleteCouponCodeById = async (couponId) => {
  const coupon = await getCouponCodeById(couponId);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon code not found');
  }
  await coupon.remove();
  return coupon;
};

/**
 * Validate and apply coupon code
 * @param {string} code
 * @param {number} originalPrice
 * @param {ObjectId} courseId - Optional course ID for checking applicability
 * @returns {Promise<Object>} - Discount information
 */
const validateAndApplyCoupon = async (code, originalPrice, courseId = null) => {
  const coupon = await getCouponCodeByCode(code);
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon code not found');
  }

  if (!coupon.isValid()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code is invalid or expired');
  }

  // Check if this coupon is applicable to the specified course
  if (courseId && coupon.applicable_courses.length > 0) {
    const isApplicable = coupon.applicable_courses.some((id) => id.toString() === courseId.toString());
    if (!isApplicable) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon not applicable for this course');
    }
  }

  if (originalPrice < coupon.min_purchase_amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Minimum purchase amount of ${coupon.min_purchase_amount} required`);
  }

  const discountedPrice = coupon.applyDiscount(originalPrice);
  const discountAmount = originalPrice - discountedPrice;

  return {
    originalPrice,
    discountedPrice,
    discountAmount,
    discountType: coupon.discount_type,
    discountValue: coupon.discount_value,
    couponCode: coupon.code,
  };
};

/**
 * Generate a referral code for a user
 * @param {ObjectId} userId
 * @param {Object} couponDetails
 * @returns {Promise<CouponCode>}
 */
const generateReferralCode = async (userId, couponDetails) => {
  // Generate a unique referral code based on userId or a random string
  const userPrefix = userId.toString().substr(0, 4).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  const referralCode = `REF-${userPrefix}-${randomPart}`;

  const couponBody = {
    code: referralCode,
    type: 'REFERRAL',
    created_by: userId,
    ...couponDetails,
  };

  return createCouponCode(couponBody);
};

module.exports = {
  createCouponCode,
  queryCouponCodes,
  getCouponCodeById,
  getCouponCodeByCode,
  updateCouponCodeById,
  deleteCouponCodeById,
  validateAndApplyCoupon,
  generateReferralCode,
};

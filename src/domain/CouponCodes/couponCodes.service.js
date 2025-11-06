/* eslint-disable camelcase */
const httpStatus = require('http-status');
// eslint-disable-next-line import/no-extraneous-dependencies
const { CouponJS } = require('couponjs');
const ApiError = require('../../utils/ApiError');
const CouponCode = require('./couponCodes.model');

/**
 * Create multiple coupon codes with performance optimization
 * @param {Object} baseCouponBody - Base coupon properties (without implement_count)
 * @param {ObjectId} userId - User ID who creates the coupons
 * @param {number} count - Number of coupons to create
 * @returns {Promise<Array<CouponCode>>}
 */
const createMultipleCoupons = async (baseCouponBody, userId, count) => {
  const coupon = new CouponJS();
  const couponsToCreate = [];
  const generatedCodes = new Set(); // Use Set for O(1) lookup to avoid duplicates

  // Generate all unique codes first
  while (generatedCodes.size < count) {
    const generatedCode = coupon.generate({
      length: 8,
      prefix: 'AVANO-',
      characterSet: {
        builtIn: ['CHARSET_ALPHA', 'CHARSET_DIGIT'],
      },
    });
    generatedCodes.add(generatedCode);
  }

  // Convert Set to Array for easier processing
  const codesArray = Array.from(generatedCodes);

  // Batch check for existing codes in database (single query for performance)
  const existingCoupons = await CouponCode.find({
    code: { $in: codesArray }
  }).select('code');

  const existingCodesSet = new Set(existingCoupons.map(c => c.code));

  // If any codes already exist, throw error with details
  if (existingCodesSet.size > 0) {
    const conflictingCodes = Array.from(existingCodesSet);
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Coupon codes already exist: ${conflictingCodes.join(', ')}`
    );
  }

  // Prepare all coupon objects for bulk insertion
  for (const code of codesArray) {
    couponsToCreate.push({
      ...baseCouponBody,
      code,
      created_by: userId,
    });
  }

  // Use insertMany for better performance (single database operation)
  try {
    const createdCoupons = await CouponCode.insertMany(couponsToCreate, {
      ordered: false, // Continue inserting even if one fails
    });
    return createdCoupons;
  } catch (error) {
    // Handle potential duplicate key errors during insertion
    if (error.code === 11000) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Some coupon codes already exist during creation');
    }
    throw error;
  }
};

/**
 * Create a coupon code
 * @param {Object} couponBody
 * @returns {Promise<CouponCode>}
 */
const createCouponCode = async (couponBody, userId) => {
  const { implement_count, ...baseCouponBody } = couponBody;

  // If implement_count is provided, create multiple coupons
  if (implement_count && implement_count > 1) {
    return createMultipleCoupons(baseCouponBody, userId, implement_count);
  }

  // Original single coupon creation logic
  const coupon = new CouponJS();
  const generatedCode = coupon.generate({
    length: 8,
    prefix: 'AVANO-',
    characterSet: {
      builtIn: ['CHARSET_ALPHA', 'CHARSET_DIGIT'],
    },
  });

  // Check if coupon code already exists
  const existingCoupon = await CouponCode.findOne({ code: generatedCode });
  if (existingCoupon) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon code already exists');
  }

  const couponProp = {
    ...baseCouponBody,
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
  // Extract date range fields
  const {
    createdAt_from,
    createdAt_to,
    updatedAt_from,
    updatedAt_to,
    deletedAt_from,
    deletedAt_to,
    valid_from,
    valid_until,
    ...remainingFilter
  } = filter;

  // Build date range queries
  const dateRangeQueries = {};

  // Handle createdAt date range
  if (createdAt_from || createdAt_to) {
    dateRangeQueries.createdAt = {};
    if (createdAt_from) {
      dateRangeQueries.createdAt.$gte = new Date(createdAt_from);
    }
    if (createdAt_to) {
      dateRangeQueries.createdAt.$lte = new Date(createdAt_to);
    }
  }

  // Handle updatedAt date range
  if (updatedAt_from || updatedAt_to) {
    dateRangeQueries.updatedAt = {};
    if (updatedAt_from) {
      dateRangeQueries.updatedAt.$gte = new Date(updatedAt_from);
    }
    if (updatedAt_to) {
      dateRangeQueries.updatedAt.$lte = new Date(updatedAt_to);
    }
  }

  // Handle deletedAt date range
  if (deletedAt_from || deletedAt_to) {
    dateRangeQueries.deletedAt = {};
    if (deletedAt_from) {
      dateRangeQueries.deletedAt.$gte = new Date(deletedAt_from);
    }
    if (deletedAt_to) {
      dateRangeQueries.deletedAt.$lte = new Date(deletedAt_to);
    }
  }

  // Handle valid_from date range
  if (valid_from) {
    dateRangeQueries.valid_from = {};
      dateRangeQueries.valid_from.$gte = new Date(valid_from);
  }

  // Handle valid_until date range
  if (valid_until) {
    dateRangeQueries.valid_until = {};
    dateRangeQueries.valid_until.$gte = new Date(valid_until);
  }

  // Merge remaining filter with date range queries
  const finalFilter = { ...remainingFilter, ...dateRangeQueries };

  const coupons = await CouponCode.paginate(finalFilter, options);
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
  createMultipleCoupons,
  createCouponCode,
  queryCouponCodes,
  getCouponCodeById,
  getCouponCodeByCode,
  updateCouponCodeById,
  deleteCouponCodeById,
  validateAndApplyCoupon,
  generateReferralCode,
};

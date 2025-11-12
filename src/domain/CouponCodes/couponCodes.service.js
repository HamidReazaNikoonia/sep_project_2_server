/* eslint-disable no-restricted-syntax */
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
    code: { $in: codesArray },
  }).select('code');

  const existingCodesSet = new Set(existingCoupons.map((c) => c.code));

  // If any codes already exist, throw error with details
  if (existingCodesSet.size > 0) {
    const conflictingCodes = Array.from(existingCodesSet);
    throw new ApiError(httpStatus.BAD_REQUEST, `Coupon codes already exist: ${conflictingCodes.join(', ')}`);
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
 * Check and Validate Coupon Codes
 * @param {Array} couponCodes - Array of coupon ObjectIDs
 * @param {String} order_variant - Order variant type (default: 'ORDER')
 * @param {Object} orderItems - Object containing products and courses arrays
 * @returns {Object} - Valid coupons, invalid coupons with reasons, and total discount
 */
const checkCoupon = async ({ couponCodes, order_variant = 'ORDER', orderItems }) => {
  const validCoupons = [];
  const invalidCoupons = [];
  let totalDiscount = 0;

  // Return early if no coupons provided
  if (!couponCodes || couponCodes.length === 0) {
    return {
      validCoupons,
      invalidCoupons,
      totalDiscount,
    };
  }

  // Fetch all coupons from database
  const coupons = await CouponCode.find({
    _id: { $in: couponCodes },
  });

  // Check if all coupon IDs were found
  const foundIds = coupons.map((c) => c._id.toString());
  const notFoundIds = couponCodes.filter((id) => !foundIds.includes(id.toString()));

  // Add not found coupons to invalid list
  notFoundIds.forEach((id) => {
    invalidCoupons.push({
      couponId: id,
      reason: 'Coupon code not found in database',
    });
  });

  // Check for REFERRAL type restriction
  const referralCoupons = coupons.filter((c) => c.type === 'REFERRAL');
  if (referralCoupons.length > 1) {
    referralCoupons.forEach((coupon) => {
      invalidCoupons.push({
        couponId: coupon._id,
        code: coupon.code,
        reason: 'Only one REFERRAL coupon is allowed per order',
      });
    });
    // Remove all referral coupons from processing
    const referralIds = referralCoupons.map((c) => c._id.toString());
    coupons.splice(0, coupons.length, ...coupons.filter((c) => !referralIds.includes(c._id.toString())));
  }

  // Check for is_combined === false restriction
  const nonCombinableCoupons = coupons.filter((c) => c.is_combined === false);
  if (nonCombinableCoupons.length > 0) {
    if (coupons.length > 1) {
      // If there are multiple coupons and one is not combinable, reject all
      coupons.forEach((coupon) => {
        invalidCoupons.push({
          couponId: coupon._id,
          code: coupon.code,
          reason:
            coupon.is_combined === false
              ? 'This coupon cannot be combined with other coupons'
              : 'Cannot be used with non-combinable coupon',
        });
      });
      return {
        validCoupons,
        invalidCoupons,
        totalDiscount: 0,
      };
    }
  }

  // Validate each coupon
  for (const coupon of coupons) {
    // Skip if already in invalid list
    if (invalidCoupons.some((inv) => inv.couponId.toString() === coupon._id.toString())) {
      continue;
    }

    // Check if coupon is valid using schema method
    if (!coupon.isValid()) {
      let reason = 'Coupon is not valid';
      const now = new Date();

      if (!coupon.is_active) {
        reason = 'Coupon is not active';
      } else if (coupon.current_uses >= coupon.max_uses) {
        reason = 'Coupon has reached maximum uses';
      } else if (now < coupon.valid_from) {
        reason = 'Coupon is not yet valid';
      } else if (now > coupon.valid_until) {
        reason = 'Coupon has expired';
      }

      invalidCoupons.push({
        couponId: coupon._id,
        code: coupon.code,
        reason,
      });
      continue;
    }

    // Check coupon_variant restriction
    if (coupon.coupon_variant === 'COURSE_SESSION') {
      invalidCoupons.push({
        couponId: coupon._id,
        code: coupon.code,
        reason: 'COURSE_SESSION coupons cannot be applied to orders',
      });
      continue;
    }

    // Check if coupon_variant matches order type
    if (coupon.coupon_variant !== 'ALL' && coupon.coupon_variant !== order_variant) {
      invalidCoupons.push({
        couponId: coupon._id,
        code: coupon.code,
        reason: `Coupon is only valid for ${coupon.coupon_variant} type`,
      });
      continue;
    }

    // Check applicable_courses restriction if specified
    if (coupon.applicable_courses && coupon.applicable_courses.length > 0) {
      const applicableCourseIds = coupon.applicable_courses.map((ac) => ac.target_id.toString());
      const orderCourseIds = orderItems.courses ? orderItems.courses.map((c) => c.toString()) : [];

      const hasApplicableCourse = orderCourseIds.some((cId) => applicableCourseIds.includes(cId));

      if (!hasApplicableCourse) {
        invalidCoupons.push({
          couponId: coupon._id,
          code: coupon.code,
          reason: 'Coupon is not applicable to any courses in this order',
        });
        continue;
      }
    }

    // Check except_courses restriction if specified
    if (coupon.except_courses && coupon.except_courses.length > 0) {
      const exceptCourseIds = coupon.except_courses.map((ec) => ec.target_id.toString());
      const orderCourseIds = orderItems.courses ? orderItems.courses.map((c) => c.toString()) : [];

      const hasExceptCourse = orderCourseIds.some((cId) => exceptCourseIds.includes(cId));

      if (hasExceptCourse) {
        invalidCoupons.push({
          couponId: coupon._id,
          code: coupon.code,
          reason: 'Coupon cannot be applied to one or more courses in this order',
        });
        continue;
      }
    }

    // Check except_coach restriction if specified
    if (coupon.except_coach && coupon.except_coach.length > 0) {
      const exceptCoachIds = coupon.except_coach.map((coach) => coach.toString());
      const orderCoachIds = orderItems.coaches ? orderItems.coaches.map((c) => c.toString()) : [];

      const hasExceptCoach = orderCoachIds.some((coachId) => exceptCoachIds.includes(coachId));

      if (hasExceptCoach) {
        invalidCoupons.push({
          couponId: coupon._id,
          code: coupon.code,
          reason: 'Coupon cannot be applied to one or more coaches in this order',
        });
        continue;
      }
    }

    // Check applicable_coach restriction if specified
    if (coupon.applicable_coach && coupon.applicable_coach.length > 0) {
      const applicableCoachIds = coupon.applicable_coach.map((coach) => coach.toString());
      const orderCoachIds = orderItems.coaches ? orderItems.coaches.map((c) => c.toString()) : [];

      // If there are no coaches in the order, coupon cannot be applied
      if (orderCoachIds.length === 0) {
        invalidCoupons.push({
          couponId: coupon._id,
          code: coupon.code,
          reason: 'Coupon requires specific coaches but no coaches found in order',
        });
        continue;
      }

      const hasApplicableCoach = orderCoachIds.some((coachId) => applicableCoachIds.includes(coachId));

      if (!hasApplicableCoach) {
        invalidCoupons.push({
          couponId: coupon._id,
          code: coupon.code,
          reason: 'Coupon is not applicable to any coaches in this order',
        });
        continue;
      }
    }

    // If all validations pass, add to valid coupons
    validCoupons.push(coupon);
  }

  return {
    validCoupons,
    invalidCoupons,
    totalDiscount, // Will be calculated when applying to actual price
  };
};

/**
 * Calculate total discount from valid coupons
 * @param {Array} validCoupons - Array of valid coupon objects
 * @param {Number} originalPrice - Original price before discount
 * @returns {Object} - Total discount and final price
 */
const calculateCouponDiscount = (validCoupons, originalPrice) => {
  let totalDiscount = 0;
  let currentPrice = originalPrice;

  for (const coupon of validCoupons) {
    let discount = 0;

    if (coupon.discount_type === 'PERCENTAGE') {
      discount = currentPrice * (coupon.discount_value / 100);
    } else if (coupon.discount_type === 'FIXED_AMOUNT') {
      discount = coupon.discount_value;
    }

    // Ensure discount doesn't exceed current price
    discount = Math.min(discount, currentPrice);
    totalDiscount += discount;
    currentPrice -= discount;
  }

  return {
    totalDiscount: Math.round(totalDiscount),
    finalPrice: Math.max(0, Math.round(currentPrice)),
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
  checkCoupon,
  calculateCouponDiscount,
};

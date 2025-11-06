const Joi = require('joi');
const { objectId } = require('../../validations/custom.validation');

const createCouponCode = {
  body: Joi.object().keys({
    type: Joi.string().required().valid('REFERRAL', 'DISCOUNT'),
    discount_type: Joi.string().required().valid('PERCENTAGE', 'FIXED_AMOUNT'),
    discount_value: Joi.number().required().min(0),
    max_uses: Joi.number().integer().min(1),
    valid_from: Joi.date(),
    valid_until: Joi.date().greater(Joi.ref('valid_from')),
    min_purchase_amount: Joi.number().min(0),
    is_active: Joi.boolean(),
    created_by: Joi.string().custom(objectId).when('type', {
      is: 'REFERRAL',
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    applicable_courses: Joi.array().items(
      Joi.object({
        target_type: Joi.string().valid('COURSE_SESSION', 'COURSE'),
        target_id: Joi.string().custom(objectId),
      })
    ),
    description: Joi.string(),
  }),
};

const getCouponCodes = {
  query: Joi.object().keys({
    code: Joi.string(),
    type: Joi.string().valid('REFERRAL', 'DISCOUNT'),
    is_active: Joi.boolean(),
    is_combined: Joi.boolean(),
    valid_from: Joi.date(),
    valid_until: Joi.date(),
    discount_type: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT'),
    coupon_variant: Joi.string().valid('COURSE_SESSION', 'ORDER', 'ALL'),
    createdAt: Joi.date(),
    createdAt_from: Joi.date(),
    createdAt_to: Joi.date(),
    updatedAt: Joi.date(),
    updatedAt_from: Joi.date(),
    updatedAt_to: Joi.date(),
    deletedAt: Joi.date(),
    deletedAt_from: Joi.date(),
    deletedAt_to: Joi.date(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getCouponCode = {
  params: Joi.object().keys({
    couponId: Joi.string().custom(objectId),
  }),
};

const updateCouponCode = {
  params: Joi.object().keys({
    couponId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      code: Joi.string(),
      discount_type: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT'),
      discount_value: Joi.number().min(0),
      max_uses: Joi.number().integer().min(1),
      valid_from: Joi.date(),
      valid_until: Joi.date(),
      min_purchase_amount: Joi.number().min(0),
      is_active: Joi.boolean(),
      applicable_courses: Joi.array().items(Joi.string().custom(objectId)),
      description: Joi.string(),
    })
    .min(1),
};

const deleteCouponCode = {
  params: Joi.object().keys({
    couponId: Joi.string().custom(objectId),
  }),
};

const validateCoupon = {
  body: Joi.object().keys({
    code: Joi.string().required(),
    price: Joi.number().required().min(0),
    courseId: Joi.string().custom(objectId),
  }),
};

const applyCoupon = {
  body: Joi.object().keys({
    code: Joi.string().required(),
    price: Joi.number().required().min(0),
    courseId: Joi.string().custom(objectId),
  }),
};

const generateReferral = {
  body: Joi.object().keys({
    discount_type: Joi.string().required().valid('PERCENTAGE', 'FIXED_AMOUNT'),
    discount_value: Joi.number().required().min(0),
    max_uses: Joi.number().integer().min(1).default(1),
    valid_until: Joi.date().required(),
    min_purchase_amount: Joi.number().min(0).default(0),
    applicable_courses: Joi.array().items(Joi.string().custom(objectId)),
  }),
};

module.exports = {
  createCouponCode,
  getCouponCodes,
  getCouponCode,
  updateCouponCode,
  deleteCouponCode,
  validateCoupon,
  applyCoupon,
  generateReferral,
};

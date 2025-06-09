const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const couponValidation = require('./couponCodes.validation');
const couponController = require('./couponCodes.controller');

const router = express.Router();

// Admin routes for managing coupon codes
router
  .route('/')
  .post(auth(), validate(couponValidation.createCouponCode), couponController.createCouponCode)
  .get(auth(), validate(couponValidation.getCouponCodes), couponController.getCouponCodes);

router
  .route('/:couponId')
  .get(auth(), validate(couponValidation.getCouponCode), couponController.getCouponCode)
  .patch(auth(), validate(couponValidation.updateCouponCode), couponController.updateCouponCode)
  .delete(auth(), validate(couponValidation.deleteCouponCode), couponController.deleteCouponCode);

// Public routes for validating and applying coupons
router.post('/validate', validate(couponValidation.validateCoupon), couponController.validateCoupon);

router.post('/apply', auth(), validate(couponValidation.applyCoupon), couponController.applyCoupon);

// Route for generating referral codes (authenticated users only)
router.post(
  '/generate-referral',
  auth(),
  validate(couponValidation.generateReferral),
  couponController.generateReferralCode
);

module.exports = router;

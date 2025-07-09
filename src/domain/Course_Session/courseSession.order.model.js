const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

/**
 *  GUIDE
 * program_original_price === program Real Price || Discounted Program Price
 * total_packages_price === Sum of Packages Prices
 * total_discount === Sum of Coupon Prices
 * program_total_price === program_original_price - total discount (Sum of coupon)
 * final_order_price === program_total_price + total_packages_price + tax
 */

const courseSessionOrderSchema = new mongoose.Schema(
  {
    courseSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course_Session',
      required: false,
    },
    classProgramId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassProgram',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    final_order_price: {
      type: Number,
      required: false,
    },
    program_original_price: {
      type: Number,
      required: false,
    },
    program_price_discounted: {
      type: Number,
      required: false,
    },
    program_price_real: {
      type: Number,
      required: true,
    },
    program_total_price: {
      type: Number,
      required: true,
    },
    total_packages_price: {
      type: Number,
      required: false,
    },
    total_discount: {
      type: Number,
      required: false,
    },
    appliedCoupons: [
      {
        couponId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'CouponCode',
          required: true,
        },
        discountAmount: {
          type: Number,
          required: true,
        },
      },
    ],
    paymentMethod: {
      type: String,
      required: true,
    },
    transactionId: {
      type: String,
    },
    reference: {
      type: String,
      required: true,
    },
    packages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session_Package',
        required: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

courseSessionOrderSchema.plugin(toJSON);
courseSessionOrderSchema.plugin(paginate);
courseSessionOrderSchema.plugin(require('mongoose-autopopulate'));

// Add a helper method to calculate total discount
courseSessionOrderSchema.methods.getTotalDiscount = function () {
  return this.appliedCoupons.reduce((total, coupon) => total + coupon.discountAmount, 0);
};

// Helper to check if a coupon is already applied
courseSessionOrderSchema.methods.hasCoupon = function (couponId) {
  return this.appliedCoupons.some((coupon) => coupon.couponId.toString() === couponId.toString());
};

const courseSessionOrderModel = mongoose.model('CourseSessionOrder', courseSessionOrderSchema);

module.exports = courseSessionOrderModel;

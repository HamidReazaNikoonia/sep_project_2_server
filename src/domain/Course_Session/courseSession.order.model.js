const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

const courseSessionOrderSchema = new mongoose.Schema(
  {
    courseSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course_Session',
      required: true,
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
    originalAmount: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
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

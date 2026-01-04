const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

const { Schema } = mongoose;

const couponCodeSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['REFERRAL', 'DISCOUNT'],
    },
    coupon_variant: {
      type: String,
      enum: ['COURSE_SESSION', 'ORDER', 'ALL'],
      default: 'COURSE_SESSION',
      required: false,
    },
    discount_type: {
      type: String,
      enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
      required: true,
    },
    discount_value: {
      type: Number,
      required: true,
      min: 0,
    },
    max_uses: {
      type: Number,
      default: 1,
      min: 1,
    },
    current_uses: {
      type: Number,
      default: 0,
    },
    valid_from: {
      type: Date,
      default: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday;
      },
    },
    valid_until: {
      type: Date,
      default: () => {
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);
        return threeYearsFromNow;
      },
    },
    min_purchase_amount: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required() {
        return this.type === 'REFERRAL';
      },
    },
    applicable_courses: [
      {
        target_type: {
          type: String,
          enum: ['COURSE_SESSION', 'COURSE'],
        },
        target_id: {
          type: Schema.Types.ObjectId,
          // We don't specify a single ref here since it could be either type
        },
      },
    ],
    applicable_coach: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Coach',
      },
    ],
    except_courses: [
      {
        target_type: {
          type: String,
          enum: ['COURSE_SESSION', 'COURSE'],
        },
        target_id: {
          type: Schema.Types.ObjectId,
          // We don't specify a single ref here since it could be either type
        },
      },
    ],
    except_coach: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Coach',
      },
    ],
    is_combined: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugin that converts mongoose to json
couponCodeSchema.plugin(toJSON);
couponCodeSchema.plugin(paginate);

// Method to check if coupon is valid
couponCodeSchema.methods.isValid = function () {
  const now = new Date();
  return this.is_active && this.current_uses < this.max_uses && now >= this.valid_from && now <= this.valid_until;
};

// Method to apply coupon and get discounted price
couponCodeSchema.methods.applyDiscount = function (originalPrice) {
  if (!this.isValid()) {
    return originalPrice;
  }

  if (originalPrice < this.min_purchase_amount) {
    return originalPrice;
  }

  let discountedPrice = originalPrice;
  if (this.discount_type === 'PERCENTAGE') {
    discountedPrice = originalPrice - originalPrice * (this.discount_value / 100);
  } else if (this.discount_type === 'FIXED_AMOUNT') {
    discountedPrice = originalPrice - this.discount_value;
  }

  return Math.max(0, discountedPrice);
};

// Method to use the coupon
couponCodeSchema.methods.use = async function () {
  if (!this.isValid()) {
    return false;
  }

  this.current_uses += 1;
  await this.save();
  return true;
};

// Method to Redo the coupon usage
couponCodeSchema.methods.redo = async function () {
  if (!this.isValid()) {
    return false;
  }

  this.current_uses -= 1;
  if (this.current_uses < 0) {
    this.current_uses = 0;
  }
  await this.save();
  return true;
};

const CouponCode = mongoose.model('CouponCode', couponCodeSchema);

module.exports = CouponCode;

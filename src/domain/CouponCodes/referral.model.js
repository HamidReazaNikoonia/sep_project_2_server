const mongoose = require('mongoose');
// const { toJSON, paginate } = require('../../models/plugins');

const { Schema } = mongoose;

const referralUsageSchema = new Schema(
  {
    // The user who owns the referral code
    // ➡️ The person who invites others
    // ➡️ The person who earns the reward
    referrer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The user who uses the referral code
    // ➡️ The person who enters the code at checkout
    // ➡️ The person who gets the discount
    referee: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    referral_code_used: {
      type: String,
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
    order_variant: {
      type: String,
      enum: ['COURSE_SESSION', 'ORDER'],
      required: false,
    },
    reward_amount: {
      type: Number,
      required: true,
    },
    discount_amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
  },
  { timestamps: true }
);

// ❗ Prevent same referee using same referrer twice
referralUsageSchema.index({ referrer: 1, referee: 1 }, { unique: true });

const Referral = mongoose.model('Referral', referralUsageSchema);

module.exports = Referral;

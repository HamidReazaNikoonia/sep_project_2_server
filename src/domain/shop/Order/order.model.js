const mongoose = require('mongoose');

const objectId = mongoose.Types.ObjectId;

// Enum Constants
const orderStatusEnum = ['waiting', 'confirmed', 'shipped', 'delivered', 'cancelled', 'returned', 'finish'];
const paymentMethodEnum = ['credit_card', 'zarinpal', 'bank_transfer', 'cash_on_delivery', 'wallet_and_zarinpal'];

// Create Order Schema
const orderSchema = mongoose.Schema(
  {
    customer: {
      type: objectId,
      required: true,
      ref: 'User',
      autopopulate: true,
    },
    transactionId: {
      type: objectId,
      required: false,
      ref: 'Transaction',
    },
    reference: {
      type: String,
      required: true,
    },
    products: [
      {
        _id: false,
        product: {
          type: objectId,
          ref: 'Product',
          required: false,
          autopopulate: true,
        },
        course: {
          type: objectId,
          ref: 'Course',
          required: false,
          autopopulate: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: orderStatusEnum,
      default: 'waiting',
    },
    paymentMethod: {
      type: String,
      enum: paymentMethodEnum,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    used_wallet_amount: {
      type: Number,
      required: false,
      min: 0,
    },
    final_order_price: {
      type: Number,
      required: false,
    },
    total_discount_price: {
      type: Number,
      required: false,
    },
    appliedCoupons: [
      {
        _id: false,
        couponId: {
          type: objectId,
          ref: 'CouponCode',
          required: true,
        },
        code: {
          type: String,
          required: true,
        },
        discountAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        discountType: {
          type: String,
          enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
        },
      },
    ],
    shippingAddress: {
      type: objectId,
      ref: 'Address',
      autopopulate: true,
    },
    billingAddress: {
      type: objectId,
      ref: 'Address',
      autopopulate: true,
    },
    deliveryFees: Number,
    taxRate: Number,
    taxes: Number,
    total: Number,
    returned: {
      type: Boolean,
      default: false,
    },
    soft_delete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

// Create Customer Schema
const addressSchema = mongoose.Schema(
  {
    customer: {
      type: objectId,
      required: true,
      ref: 'User',
    },
    billingAddress: {
      addressLine1: {
        type: String,
        required: true,
      },
      addressLine2: String,
      city: {
        type: Number,
        required: false,
      },
      state: {
        type: Number,
        required: true,
      },
      postalCode: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        required: false,
        default: 'IRAN',
      },
      title: String,
    },
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt fields
  }
);

orderSchema.plugin(require('mongoose-autopopulate'));

orderSchema.pre(['find', 'findOne'], function(next) {
  this.select('-soft_delete');
  this.where({ soft_delete: false });
  next();
});

// Export the Order model
const Order = mongoose.model('Order', orderSchema);
const Address = mongoose.model('Address', addressSchema);

module.exports = {
  Order,
  Address,
};

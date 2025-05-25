const mongoose = require('mongoose');

const objectId = mongoose.Types.ObjectId;

// Enum Constant
const referenceStatusEnum = ['CREATED', 'WAITING', 'RESOLVE', 'REJECTED'];
const referenceTypeEnum = ['HOZORI', 'ONLINE', 'BY_TELEPHONE'];
const consultReasonFromUser = ["EZDEVAJ", "PISH_AZ_BARDARI"];

const referenceSchema = mongoose.Schema(
  {
    customer: {
      type: objectId, // Gets id of User
      required: true,
      ref: 'Customer', // Adds relationship between Product and User
    },
    consult: {
      type: objectId,
      required: true,
      ref: 'Consult',
      autopopulate: true
    },
    consultant_dr_id: {
      type: objectId,
      required: false,
      ref: 'User',
    },
    description: {
      type: String,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    is_giftcard: {
      type: Boolean,
      default: false,
    },
    gifcard_code: Number,
    status: {
      type: String,
      enum: referenceStatusEnum,
    },
    ref_type: {
      type: String,
      enum: referenceTypeEnum,
    },
    qr_code: String,

    discountable: {
      type: Boolean,
      default: false,
    },
    payment_status: {
      type: Boolean,
      default: false,
    },
    payment_reference_id: {
      type: objectId, // Gets id of Transaction
      required: false,
      ref: 'Transaction', // Adds relationship between Product and User
    },
    consult_reason: {
      type: String,
      enum: consultReasonFromUser
    },
    time_slot: {
      type: objectId,
      required: false,
      ref: 'TimeSlot',
      autopopulate: true
    },
    follow_up_code: {
      type: String
    }
  },
  {
    timestamps: true,
  }
);

referenceSchema.plugin(require('mongoose-autopopulate'));

// referenceSchema.virtual("url").get(function () {
//   return `/product/${this._id}`;
// });

const Reference = mongoose.model('Reference', referenceSchema);

module.exports = Reference;

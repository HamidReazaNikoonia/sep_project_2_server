const mongoose = require('mongoose');

// Enum Constant
// const referenceStatusEnum = ["CREATED", "WAITING", "RESOLVE", "REJECTED"];
// const referenceTypeEnum = ["HOZORI", "ONLINE", "BY_TELEPHONE"];

const adminSettingSchema = mongoose.Schema(
  {
    payment: {
      reference_price: {
        type: Number,
        default: 500000,
      },
    },
    discountable: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// referenceSchema.plugin(require("mongoose-autopopulate"));

const AdminSetting = mongoose.model('AdminSetting', adminSettingSchema);

module.exports = AdminSetting;

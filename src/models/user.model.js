const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

const getMobiles = require('../utils/mobileValidation');

// Iranian National ID validation function
const validateIranianNationalId = (nationalId) => {
  if (!nationalId || nationalId.length !== 10) {
    return false;
  }

  // Check if all digits are the same
  if (/^(\d)\1{9}$/.test(nationalId)) {
    return false;
  }

  // Calculate check digit
  let sum = 0;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 9; i++) {
    sum += parseInt(nationalId[i], 10) * (10 - i);
  }

  const remainder = sum % 11;
  const checkDigit = remainder < 2 ? remainder : 11 - remainder;

  return parseInt(nationalId[9], 10) === checkDigit;
};

const { Schema } = mongoose;

const userSchema = mongoose.Schema(
  {
    first_name: {
      type: String,
      required: false,
      trim: true,
    },
    last_name: {
      type: String,
      required: false,
      trim: true,
    },
    age: {
      type: Number,
      required: false,
      validate(val) {
        if (val === 0 || val <= 0 || val >= 120) {
          throw new Error(' Invalid age');
        }
      },
    },
    gender: {
      type: String,
      require: false,
      enum: ['M', 'W'],
    },
    city: {
      type: String,
    },
    country: {
      type: String,
      default: 'IRAN',
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
      validate(value) {
        if (!getMobiles(value)[0]) {
          throw new Error('Invalid Mobile');
        }
      },
    },
    otp: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: false,
      unique: false,
      trim: true,
      lowercase: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error('Invalid email');
        }
      },
    },
    password: {
      type: String,
      required: false,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
          throw new Error('Password must contain at least one letter and one number');
        }
      },
      private: true, // used by the toJSON plugin
    },
    role: {
      type: String,
      enum: roles,
      default: 'user',
    },
    avatar: {
      type: Schema.Types.ObjectId,
      required: false,
      ref: 'Upload',
      autopopulate: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    nationalId: {
      type: String,
      required: false,
      validate: validateIranianNationalId,
    },
    isNationalIdVerified: {
      type: Boolean,
      default: false,
    },
    national_card_images: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Upload',
        autopopulate: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
userSchema.plugin(toJSON);
userSchema.plugin(paginate);

userSchema.plugin(require('mongoose-autopopulate'));

/**
 * Check if email is taken
 * @param {string} email - The user's email
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ email, _id: { $ne: excludeUserId } });
  return !!user;
};

/**
 * Check if password matches the user's password
 * @param {string} password
 * @returns {Promise<boolean>}
 */
userSchema.methods.isPasswordMatch = async function (password) {
  const user = this;
  return bcrypt.compare(password, user.password);
};

userSchema.pre('save', async function (next) {
  const user = this;
  if (user.password) {
    if (user.isModified('password')) {
      user.password = await bcrypt.hash(user.password, 8);
    }
  }
  next();
});

/**
 * @typedef User
 */
const User = mongoose.model('User', userSchema);

module.exports = User;

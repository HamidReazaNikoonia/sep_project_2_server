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
    father_name: {
      type: String,
      required: false,
      trim: true,
    },
    student_id: {
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
    birth_date: {
      type: Date,
      required: false,
    },
    personal_img: {
      type: Schema.Types.ObjectId,
      ref: 'Upload',
      autopopulate: true,
    },
    gender: {
      type: String,
      require: false,
      enum: ['M', 'W'],
    },
    city: {
      type: Number,
    },
    province: {
      type: Number,
    },
    country: {
      type: String,
      default: 'IRAN',
    },
    address: {
      type: String,
      required: false,
    },
    job_title: String,
    mariage_status: {
      type: String,
      enum: ['single', 'married', 'widowed', 'divorced'],
      default: 'single',
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
    tel: {
      type: String,
      required: false,
      validate(value) {
        if (!/^\d+$/.test(value)) {
          throw new Error('Telephone number must contain only digits');
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
    isVerified: {
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
    course_session_program_enrollments: [
      {
        program: {
          type: Schema.Types.ObjectId,
          ref: 'ClassProgram',
        },
        startedAt: {
          type: Date,
          required: false,
        },
        is_active: {
          type: Boolean,
          default: true,
        },
        is_valid: {
          type: Boolean,
          default: false,
        },
        is_completed: {
          type: Boolean,
          default: false,
        },
        endedAt: {
          type: Date,
        },
      },
    ],
    national_card_images: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Upload',
        autopopulate: true,
      },
    ],
    wallet_amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    referral_code: {
      type: String,
      required: false,
      unique: true,
    },
    referred_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
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
 * Check if mobile is taken
 * @param {string} mobile - The user's mobile
 * @param {ObjectId} [excludeUserId] - The id of the user to be excluded
 * @returns {Promise<boolean>}
 */
userSchema.statics.isMobileTaken = async function (mobile, excludeUserId) {
  const user = await this.findOne({ mobile, _id: { $ne: excludeUserId } });
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

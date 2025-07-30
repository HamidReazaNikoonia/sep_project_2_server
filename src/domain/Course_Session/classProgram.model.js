const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

const { Schema } = mongoose;

const sessionPackagesSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    min: [10000, 'Price must be at least 10,000.'],
    required: true,
  },
  avatar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
  },
});

const sessionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      validate: {
        validator(date) {
          // Only validate dates for new sessions or when date is being modified
          if (this.isNew || this.isModified('date')) {
            return date > new Date();
          }
          return true;
        },
        message: 'Session date must be in the future',
      },
    },
    startTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      validate: {
        validator(endTime) {
          return endTime > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    meetingLink: String,
    location: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  { _id: true }
);

const classProgramSchema = mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course_Session',
      required: true,
      autopopulate: true,
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
      required: true,
      autopopulate: true,
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
      ref: 'ClassNo',
      autopopulate: true,
    },
    subjects: [
      {
        title: String,
        sub_title: String,
      },
    ],
    sample_media: [
      {
        media_type: String,
        media_title: String,
        url_address: String,
        file: {
          type: Schema.Types.ObjectId,
          ref: 'Upload',
          autopopulate: true,
        },
      },
    ],
    packages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session_Package',
        autopopulate: true,
      },
    ],
    price_real: {
      type: Number,
      required: true,
      min: [10000, 'Price must be at least 10,000.'],
    },
    price_discounted: {
      type: Number,
      required: false,
      min: [0, 'Discounted price must be positive.'],
    },
    is_fire_sale: {
      type: Boolean,
      default: false,
    },
    program_type: {
      type: String,
      enum: ['ONLINE', 'ON-SITE'],
      required: true,
    },
    max_member_accept: {
      type: Number,
      default: 10,
      min: 1,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    course_language: String,
    course_duration: Number,
    is_have_licence: {
      type: Boolean,
      default: false,
    },
    licence: String,
    score: Number,
    sessions: [sessionSchema],
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// plugins
classProgramSchema.plugin(toJSON);
classProgramSchema.plugin(paginate);
classProgramSchema.plugin(require('mongoose-autopopulate'));

// Indexes
classProgramSchema.index({ course: 1 });
classProgramSchema.index({ coach: 1 });
classProgramSchema.index({ 'sessions.date': 1 });

// Add compound indexes for common filter combinations

classProgramSchema.index({ program_type: 1, status: 1 });
classProgramSchema.index({ is_fire_sale: 1, status: 1 });
classProgramSchema.index({ createdAt: -1 });

const sessionPackageModel = mongoose.model('Session_Package', sessionPackagesSchema);
const classProgramModel = mongoose.model('ClassProgram', classProgramSchema);
module.exports = { sessionPackageModel, classProgramModel };

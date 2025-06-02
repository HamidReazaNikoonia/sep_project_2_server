const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

const sessionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      validate: {
        validator(date) {
          return date > new Date();
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
      ref: 'Course',
      required: true,
    },
    coach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coach',
      required: true,
    },
    class_id: {
      type: String,
      required: true,
      // unique: true,
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

classProgramSchema.plugin(toJSON);
classProgramSchema.plugin(paginate);
classProgramSchema.plugin(require('mongoose-autopopulate'));

// Indexes
classProgramSchema.index({ course: 1 });
classProgramSchema.index({ coach: 1 });
classProgramSchema.index({ 'sessions.date': 1 });

module.exports = mongoose.model('ClassProgram', classProgramSchema);

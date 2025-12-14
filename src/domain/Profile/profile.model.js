const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      autopopulate: true,
    },
    likedProduct: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    likedCourse: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
      },
    ],
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        autopopulate: true,
      },
    ],
    course_session_program_enrollments: [
      {
        program_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ClassProgram',
          autopopulate: true,
        },
        startedAt: {
          type: Date,
          required: false,
        },
        score: {
          type: Number,
          default: 0,
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
      }
    ],
  },
  { timestamps: true }
);

profileSchema.plugin(require('mongoose-autopopulate'));

const Profile = mongoose.model('Profile', profileSchema);
module.exports = Profile;

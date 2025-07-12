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
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassProgram',
        autopopulate: true,
      },
    ],
  },
  { timestamps: true }
);

profileSchema.plugin(require('mongoose-autopopulate'));

const Profile = mongoose.model('Profile', profileSchema);
module.exports = Profile;

// models/Course.js
const mongoose = require('mongoose');

const questionOptionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const courseQuestionSchema = new mongoose.Schema({
  question_title: {
    type: String,
    required: true,
    trim: true,
  },
  options: [questionOptionSchema],
  points: {
    type: Number,
    default: 1,
  },
});

const courseObjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  video_file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
    required: true,
    autopopulate: true,
  },
  exam: [courseQuestionSchema],
  order: Number,
});

const coachCourseProgramSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    is_have_penalty: {
      type: Boolean,
      default: false,
    },
    penalty_fee: {
      type: Number,
      default: 0,
    },
    course_subject_count: Number,
    course_object: [courseObjectSchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming you have a User model for admin
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

coachCourseProgramSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('CoachCourseProgram', coachCourseProgramSchema);

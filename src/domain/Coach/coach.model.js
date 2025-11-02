const mongoose = require('mongoose');
const UserModel = require('../../models/user.model');

const { Schema } = mongoose;

const courseSubjectProgressSchema = new Schema({
  subjectId: {
    // Reference to courseObject._id
    type: Schema.Types.ObjectId,
    required: true,
  },
  order: Number, // Keep track of subject order
  isCompleted: {
    type: Boolean,
    default: false,
  },
  completedAt: Date,
  examScore: Number,
  examAnswers: [
    {
      questionId: Schema.Types.ObjectId,
      selectedOptionId: Schema.Types.ObjectId,
      isCorrect: Boolean,
    },
  ],
  expireDate: {
    type: Date,
    required: true,
  },
});

const enrolledCourseSchema = new Schema({
  coach_course_program_id: {
    type: Schema.Types.ObjectId,
    ref: 'CoachCourseProgram',
    required: true,
  },
  enrolled_at: {
    type: Date,
    default: Date.now,
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  completedSubjects: [courseSubjectProgressSchema],
  currentSubjectIndex: {
    type: Number,
    default: 0,
  },
});

const coachSchema = new Schema({
  access_level: {
    type: String,
    default: 'none',
  },
  permission: {
    type: Boolean,
    default: false,
  },
  access_level_request: {
    type: String,
    default: 'none',
  },
  coach_is_valid: {
    type: Boolean,
  },
  courseSessionsProgram: [
    {
      type: Schema.Types.ObjectId,
      ref: 'ClassProgram',
      required: false,
      autopopulate: {
        select:
          'course_name members createdAt sessions program_type course_language course_duration is_have_licence licence score status class_id',
      },
    },
  ],
  featured: {
    type: Boolean,
    default: false,
  },
  description: String,
  description_long: String,
  tags: [String],
  coach_Information: {
    father_name: String,
    national_code: String,
    birth_date: String,
    city: Number,
    state: Number,
    description: String,
    group_name: String,
  },
});

coachSchema.plugin(require('mongoose-autopopulate'));

const Coach = UserModel.discriminator('Coach', coachSchema);

module.exports = Coach;

const mongoose = require('mongoose');

const classNoSchema = new mongoose.Schema(
  {
    class_title: {
      type: String,
      required: true,
      trim: true,
    },
    class_status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE',
    },
    class_max_student_number: {
      type: Number,
      required: true,
      min: [1, 'Class must have at least 1 student.'],
    },
  },
  {
    timestamps: true,
  }
);

const ClassNo = mongoose.model('ClassNo', classNoSchema);

module.exports = ClassNo;

const mongoose = require('mongoose');

const objectId = mongoose.Types.ObjectId;

const timeSlotSchema = new mongoose.Schema(
  {
    date: {
      type: String, // Store date as a string in the format of '1400/05/23'
      required: true,
    },
    startTime: {
      type: String, // Example '09:00'
      required: true,
    },
    endTime: {
      type: String, // Example '10:00'
      required: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    referenceId: {
      type: objectId,
      required: false,
    }
  },
  {
    timestamps: true,
  }
);

// referenceSchema.virtual("url").get(function () {
//   return `/product/${this._id}`;
// });

const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);

module.exports = TimeSlot;

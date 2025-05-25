// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: true,
  },
  notification_type: {
    type: String,
    enum: ['success_create_reference', 'payment_fail_create_reference', 'from_admin'],
    required: true,
  },
  state: {
    reference_id: String,
    startTime: Date,
    endTime: Date,
  },
  sendBy: {
    type: [String],
    enum: ['SMS', 'Email', 'Push'],
    required: true,
  },
  message: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);

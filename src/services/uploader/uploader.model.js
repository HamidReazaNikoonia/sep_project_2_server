const mongoose = require('mongoose');

const uploadSchema = new mongoose.Schema(
  {
    file_name: String,
    field_name: String,
    path: String,
  },
  {
    timestamps: true,
  }
);

/**
 * @typedef Service
 */
module.exports = mongoose.model('Upload', uploadSchema);

const mongoose = require('mongoose');

/**
 * Helper function to convert comma-separated string to array of ObjectIds
 * @param {string} str - Comma-separated string of IDs
 * @returns {Array} - Array of ObjectId instances
 */
const queryParamsStringToArray = (str) => {
  if (!str) return [];
  return str
    .split(',')
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => mongoose.Types.ObjectId(id)); // Convert to ObjectId instances
};

module.exports = queryParamsStringToArray;

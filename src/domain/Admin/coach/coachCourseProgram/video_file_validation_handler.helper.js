const { isValidObjectId } = require('mongoose');
const httpStatus = require('http-status');

const ApiError = require('../../../../utils/ApiError');
const Upload = require('../../../../services/uploader/uploader.model'); // Adjust path as needed

async function videoFileValidationHandler(courseObjects) {
  if (!Array.isArray(courseObjects)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Input must be an array of course objects');
  }

  // Collect all video_file IDs and validate ObjectId format
  const videoFileIds = [];
  const invalidIds = [];

  courseObjects.forEach((course, courseIndex) => {
    if (!course.video_file) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Course at index ${courseIndex} is missing video_file`);
    }

    if (!isValidObjectId(course.video_file)) {
      invalidIds.push({
        index: courseIndex,
        id: course.video_file,
        reason: 'Invalid ObjectId format',
      });
    } else {
      videoFileIds.push(course.video_file);
    }
  });

  if (invalidIds.length > 0) {
    // eslint-disable-next-line no-console
    console.log('invalid video file', invalidIds);
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid video file references found');
  }

  // Check existence in database with a single query
  const existingVideos = await Upload.find({
    _id: { $in: videoFileIds },
  })
    .select('_id')
    .lean();

  const existingIds = new Set(existingVideos.map((video) => video._id.toString()));
  const missingIds = videoFileIds.filter((id) => !existingIds.has(id.toString()));

  if (missingIds.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Some video files were not found in the database');
  }

  return true; // All validations passed
}

module.exports = videoFileValidationHandler;

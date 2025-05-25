/* eslint-disable no-restricted-syntax */
// jobs/checkCourseExpiry.job.js
const cron = require('node-cron');
// const moment = require('moment');
const Coach = require('../domain/Coach/coach.model');

class CourseExpiryJob {
  static start() {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        // eslint-disable-next-line no-console
        console.log('Running course expiry check...');
        const now = new Date();

        // Find all coaches with active courses
        const coaches = await Coach.find({
          'enrolledCourses.isActive': true,
        });

        for (const coach of coaches) {
          for (const enrolledCourse of coach.enrolledCourses) {
            // eslint-disable-next-line no-continue
            if (!enrolledCourse.isActive) continue;

            const currentSubject = enrolledCourse.completedSubjects[enrolledCourse.currentSubjectIndex];

            // Check if current subject is expired and not completed
            if (currentSubject && !currentSubject.isCompleted && currentSubject.expireDate < now) {
              // Deactivate the course for this coach
              enrolledCourse.isActive = false;
              // eslint-disable-next-line no-console
              console.log(`Deactivated course ${enrolledCourse.courseId} for coach ${coach._id} due to expired subject`);
            }
          }

          // eslint-disable-next-line no-await-in-loop
          await coach.save();
        }

        // eslint-disable-next-line no-console
        console.log('Course expiry check completed');
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error in course expiry job:', error);
      }
    });
  }
}

module.exports = CourseExpiryJob;

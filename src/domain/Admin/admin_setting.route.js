const express = require('express');

const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

// validation
const { createCoachCourseProgram, deleteCoachCourseProgram } = require('./admin_setting.validation');

const adminSettingRoutes = express.Router();

const {
  getAllAcessLevel,
  implementAccessLevel,
  updateAccessLevel,
  deleteAccessLevel,
} = require('./coach/coachCourseProgram/coach_course_program.controller');

adminSettingRoutes
  .route('/coach-course-program/set-access-level')
  .get(auth(), getAllAcessLevel)
  .post(auth(), validate(createCoachCourseProgram), implementAccessLevel);

adminSettingRoutes
  .route('/coach-course-program/set-access-level/:programId')
  .put(auth(), updateAccessLevel)
  .delete(auth(), validate(deleteCoachCourseProgram), deleteAccessLevel);

module.exports = { adminSettingRoutes };

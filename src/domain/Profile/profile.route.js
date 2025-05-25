const express = require('express');

const router = express.Router();
const profileController = require('./profile.controller');

const auth = require('../../middlewares/auth');
// const validate = require('../../middlewares/validate');

// Get a user's profile
router.get('/:user_id', profileController.getProfile);

// Get UserCourses with userId and Course Id
router.get('/:user_id/course/:course_id', auth(), profileController.getUserCourse);

// Update liked products or courses
router.put('/:user_id', profileController.updateProfile);

router.patch('/:user_id/complete-profile', auth(), profileController.completeProfile);

module.exports = router;

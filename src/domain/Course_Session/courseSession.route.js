const express = require('express');
const courseController = require('./courseSession.controller');
// const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const { courseCategoryValidation } = require('./courseSession.validation');

const router = express.Router();

router.route('/').get(courseController.getAllCourses);

// ********** ADMIN ROUTE **********
router
  .route('/admin')
  .get(courseController.getAllCoursesSessionForAdmin)
  .post(validate(courseCategoryValidation.createCourse), courseController.createCourseSession);

// router.post('/apply/:course_id', courseController.applyForCourse); // NEW ROUTE

// // Route Category
router
  .route('/category')
  .get(courseController.getAllCategories)
  .post(validate(courseCategoryValidation.createCategory), courseController.createCategory);

router
  .route('/category/:categoryId/subcategories')
  .get(courseController.getSubCategories)
  .post(validate(courseCategoryValidation.createSubCategory), courseController.createSubCategory);

// /// ///////
router.get('/:slug', courseController.getCourseBySlugOrId);

// // Update a course
router.put('/:course_id', courseController.updateCourse);

// Update and assign a coach to a course
router.put('/:course_id/assign-coach', courseController.assignClassProgram);
router.get('/:course_id/program', courseController.getAllProgramsOFSpecificCourse);

// // Delete a course
router.delete('/:course_id', courseController.deleteCourse);

// // Get course File (Provate)
// router.get('/file/:fileId', auth(), courseController.getCoursePrivateFile);

module.exports = router;

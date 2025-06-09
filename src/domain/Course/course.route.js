const express = require('express');
const courseController = require('./course.controller');
const courseCategoryController = require('./Category/category.controller');
const auth = require('../../middlewares/auth');
// const validate = require('../../middlewares/validate');

// const { courseCategoryValidation } = require('./course.validation');

const router = express.Router();

router.route('/').get(courseController.getAllCourses).post(courseController.createCourse);

// ADMIN ROUTE
router.route('/admin').get(auth(), courseController.getAllCoursesForAdmin);

router.post('/apply/:course_id', courseController.applyForCourse); // NEW ROUTE

// Route Category
router.route('/category').get(courseCategoryController.getCategoryTree).post(courseCategoryController.createCategory);

router.route('/category/:categoryId').get(courseCategoryController.getCategoryById);

/// ///////
router.get('/:slug', courseController.getCourseBySlugOrId);

// Update a course
router.put('/:course_id', courseController.updateCourse);

// Delete a course
router.delete('/:course_id', courseController.deleteCourse);

// Get course File (Provate)
router.get('/file/:fileId', auth(), courseController.getCoursePrivateFile);

module.exports = router;

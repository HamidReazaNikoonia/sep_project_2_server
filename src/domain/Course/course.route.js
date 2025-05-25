const express = require('express');
const courseController = require('./course.controller');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.route('/').get(courseController.getAllCourses).post(courseController.createCourse);

// ADMIN ROUTE
router.route('/admin').get(auth(), courseController.getAllCoursesForAdmin);

router.post('/apply/:course_id', courseController.applyForCourse); // NEW ROUTE

router.route('/category').get(courseController.getAllCourseCategories).post(courseController.createCourseCategory);

router.get('/:slug', courseController.getCourseBySlugOrId);

// Update a course
router.put('/:course_id', courseController.updateCourse);

// Delete a course
router.delete('/:course_id', courseController.deleteCourse);

// Get course File (Provate)
router.get('/file/:fileId', auth(), courseController.getCoursePrivateFile);

module.exports = router;

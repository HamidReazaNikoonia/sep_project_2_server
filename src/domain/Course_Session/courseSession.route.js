const express = require('express');
const courseController = require('./courseSession.controller');
const categoryController = require('./Category/category.controller');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

const { courseCategoryValidation } = require('./courseSession.validation');

const router = express.Router();

router.route('/').get(courseController.getAllCourses);

// ********** ADMIN ROUTE **********
router
  .route('/admin')
  .get(courseController.getAllCoursesSessionForAdmin)
  .post(validate(courseCategoryValidation.createCourse), courseController.createCourseSession);

router
  .route('/admin/course-session-package')
  .get(courseController.getAllCourseSessionPackage)
  .post(courseController.createCourseSessionPackage);

router.route('/admin/program').get(auth(), courseController.getAllProgramsForAdmin);
router.route('/admin/program/:program_id').get(auth(), courseController.getSpecificProgram);

/**
 * Program Management Routes
 */
// Get Program Session Members by Id
router.route('/admin/program/:program_id/members').get(auth(), courseController.getProgramMembers);
// Complete Session by Id
router.route('/admin/program/:program_id/complete-session/:session_id').post(auth(), courseController.completeSessionById);
// Cancel Program Session By Id
router.route('/admin/program/:program_id/cancel-session/:session_id').post(auth(), courseController.cancelSessionById);

/**
 * ******************************
 */

/**
 * Program Orders
 */
router.route('/admin/program-orders').get(auth(), courseController.getAllOrdersOfProgramForAdmin);
router
  .route('/admin/program-orders/:order_id')
  .get(auth(), courseController.getOrdersOfProgramByIdForAdmin)
  .patch(auth(), courseController.updateOrderStatus);

router.route('/admin/program/:userId').get(courseController.getAllProgramsOfSpecificUser);

// router.post('/apply/:course_id', courseController.applyForCourse); // NEW ROUTE

// // Route Category
// router
//   .route('/category')
//   .get(courseController.getAllCategories)
//   .post(validate(courseCategoryValidation.createCategory), courseController.createCategory);

// router
//   .route('/category/:categoryId/subcategories')
//   .get(courseController.getSubCategories)
//   .post(validate(courseCategoryValidation.createSubCategory), courseController.createSubCategory);

router.post('/category', categoryController.createCategory);
router.get('/category/tree', categoryController.getCategoryTree);
router.get('/category/:id', categoryController.getCategoryById);

// get Specific course-session Program by id
router.get('/program/:program_id', courseController.getSpecificProgram);
// /// ///////

// ********** CHECKOUT ORDER **********
// Pre checkout Order
router.post('/calculate-order-summary', auth(), courseController.calculateOrderSummary);
router.post('/order', auth(), courseController.createCourseSessionOrder);
router.get('/order/:order_id', auth(), courseController.getCourseSessionOrderById);
router.post('/order/:order_id/retry', auth(), courseController.retryCourseSessionOrder);
router.get('/order/:order_id/validate-checkout', courseController.validateCheckoutCourseSessionOrder);

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

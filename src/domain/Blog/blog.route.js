const express = require('express');
const blogController = require('./blog.controller');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const blogValidation = require('./blog.validation');

const router = express.Router();

// Admin routes
router
  .route('/admin')
  .get(auth(), validate(blogValidation.getBlogList), blogController.getBlogsForAdmin)
  .post(auth(), validate(blogValidation.createBlog), blogController.createBlog);

// Admin routes for specific blog
router
  .route('/admin/:blogId')
  .get(auth(), validate(blogValidation.getBlogById), blogController.getBlogByIdForAdmin)
  .put(auth(), validate(blogValidation.updateBlog), blogController.updateBlog)
  .delete(auth(), validate(blogValidation.deleteBlog), blogController.deleteBlog);

// User routes
router.route('/').get(validate(blogValidation.getBlogList), blogController.getBlogsForUsers);

// Get specific blog for users
router.route('/:blogId').get(validate(blogValidation.getBlogById), blogController.getBlogByIdForUsers);

module.exports = router;

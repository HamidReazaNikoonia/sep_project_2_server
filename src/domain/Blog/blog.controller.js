const httpStatus = require('http-status');
const catchAsync = require('../../utils/catchAsync');
const blogService = require('./blog.service');

/**
 * Create a new blog
 */
const createBlog = catchAsync(async (req, res) => {
  const blog = await blogService.createBlog(req.body, req.user);
  res.status(httpStatus.CREATED).send(blog);
});

/**
 * Get blogs for admin with advanced filtering
 */
const getBlogsForAdmin = catchAsync(async (req, res) => {
  const filter = blogService.buildBlogFilter(req.query);
  const options = {
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  };

  const result = await blogService.queryBlogs(filter, options);
  res.send(result);
});

/**
 * Get blogs for users with advanced filtering
 */
const getBlogsForUsers = catchAsync(async (req, res) => {
  const filter = blogService.buildBlogFilter(req.query);
  const options = {
    page: req.query.page,
    limit: req.query.limit,
    sortBy: req.query.sortBy,
    sortOrder: req.query.sortOrder,
  };

  const result = await blogService.queryBlogs(filter, options);
  res.send(result);
});

/**
 * Get blog by ID for admin
 */
const getBlogByIdForAdmin = catchAsync(async (req, res) => {
  const blog = await blogService.getBlogById(req.params.blogId, true);
  res.send(blog);
});

/**
 * Get blog by ID for users
 */
const getBlogByIdForUsers = catchAsync(async (req, res) => {
  const blog = await blogService.getBlogById(req.params.blogId);
  res.send(blog);
});

/**
 * Update a blog
 */
const updateBlog = catchAsync(async (req, res) => {
  const blog = await blogService.updateBlog(req.params.blogId, req.body);
  res.send(blog);
});

/**
 * Delete a blog
 */
const deleteBlog = catchAsync(async (req, res) => {
  await blogService.deleteBlog(req.params.blogId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createBlog,
  getBlogsForAdmin,
  getBlogsForUsers,
  getBlogByIdForAdmin,
  getBlogByIdForUsers,
  updateBlog,
  deleteBlog,
};

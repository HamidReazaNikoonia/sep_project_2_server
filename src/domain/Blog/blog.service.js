const httpStatus = require('http-status');
const mongoose = require('mongoose');
const Blog = require('./blog.model');
const ApiError = require('../../utils/ApiError');

/**
 * Create a new blog
 * @param {Object} blogBody - Blog creation data
 * @param {Object} author - Author object (from authenticated user)
 * @returns {Promise<Blog>}
 */
const createBlog = async (blogBody, author) => {
  const blogData = {
    ...blogBody,
    author: author._id,
  };
  return Blog.create(blogData);
};

/**
 * Query for blogs with advanced filtering and pagination
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryBlogs = async (filter, options) => {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  // Construct sort options
  const sortOptions = {
    [sortBy]: sortOrder === 'desc' ? -1 : 1,
  };

  // Pagination options
  const paginationOptions = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sort: sortOptions,
    populate: 'author',
  };

  // Use the paginate method from the model
  return Blog.paginate(filter, paginationOptions);
};

/**
 * Build blog filter based on query parameters
 * @param {Object} queryParams - Query parameters
 * @returns {Object} Mongo filter object
 */
const buildBlogFilter = (queryParams) => {
  const filter = {};

  // Search query for title, content, sub_title
  if (queryParams.q) {
    filter.$or = [
      { title: { $regex: queryParams.q, $options: 'i' } },
      { content: { $regex: queryParams.q, $options: 'i' } },
      { sub_title: { $regex: queryParams.q, $options: 'i' } },
    ];
  }

  // Filter by tags
  if (queryParams.tags) {
    const tagsArray = Array.isArray(queryParams.tags) ? queryParams.tags : [queryParams.tags];
    filter.tags = { $in: tagsArray };
  }

  // Date range filter
  if (queryParams.from_date || queryParams.to_date) {
    filter.createdAt = {};
    if (queryParams.from_date) {
      filter.createdAt.$gte = new Date(queryParams.from_date);
    }
    if (queryParams.to_date) {
      filter.createdAt.$lte = new Date(queryParams.to_date);
    }
  }

  // Filter by author
  if (queryParams.author) {
    filter.author = mongoose.Types.ObjectId(queryParams.author);
  }

  // Specific blog ID
  if (queryParams._id) {
    filter._id = mongoose.Types.ObjectId(queryParams._id);
  }

  return filter;
};

/**
 * Get blog by ID
 * @param {string} id - Blog ID
 * @param {boolean} [isAdmin=false] - Whether to include unpublished blogs
 * @returns {Promise<Blog>}
 */
const getBlogById = async (id) => {
  const blog = await Blog.findById(id).populate('author', 'name email');

  if (!blog) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Blog not found');
  }

  return blog;
};

/**
 * Update blog by ID
 * @param {string} blogId - Blog ID
 * @param {Object} updateBody - Update data
 * @returns {Promise<Blog>}
 */
const updateBlog = async (blogId, updateBody) => {
  const blog = await getBlogById(blogId);

  Object.assign(blog, updateBody);
  await blog.save();

  return blog;
};

/**
 * Delete blog by ID
 * @param {string} blogId - Blog ID
 * @returns {Promise<Blog>}
 */
const deleteBlog = async (blogId) => {
  const blog = await getBlogById(blogId);
  await blog.remove();
  return blog;
};

module.exports = {
  createBlog,
  queryBlogs,
  buildBlogFilter,
  getBlogById,
  updateBlog,
  deleteBlog,
};

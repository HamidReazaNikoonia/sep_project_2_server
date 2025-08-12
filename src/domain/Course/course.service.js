/* eslint-disable camelcase */
/* eslint-disable no-return-await */
const path = require('node:path');
const fs = require('node:fs');
const httpStatus = require('http-status');
const { Course, CourseCategory, SubCategory } = require('./course.model');
const APIFeatures = require('../../utils/APIFeatures');
const User = require('../../models/user.model'); // Assuming User model exists
const Profile = require('../Profile/profile.model');

const ApiError = require('../../utils/ApiError');

// Security helper function
function isSafePath(filePath) {
  const resolvedPath = path.resolve(filePath);
  return resolvedPath.startsWith(path.resolve(__dirname, '../../..', 'storage'));
}

const applyForCourse = async ({ courseId, userId }) => {
  const courseDoc = await Course.findById(courseId);
  if (!courseDoc) {
    throw new Error('Course not found');
  }

  const userDoc = await User.findById(userId);
  if (!userDoc) {
    throw new Error('User not found');
  }

  // Check if course is full
  if (courseDoc.member.length >= courseDoc.max_member_accept) {
    throw new Error('This course has reached its maximum number of members.');
  }

  // Check if the user is already a member
  const isUserAlreadyMember = courseDoc.member.some((member) => member.user.toString() === userId);
  if (isUserAlreadyMember) {
    throw new Error('User is already a member of this course.');
  }

  // Add user to course members
  courseDoc.member.push({ user: userId });
  await courseDoc.save();

  return courseDoc;
};

// ADMIN SERVICES

const getAllCoursesForAdmin = async ({ filter, options }) => {
  const { q, price_from, price_to, ...otherFilters } = filter;

  // If there's a search query, create a search condition
  if (q) {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const searchRegex = new RegExp(q, 'i'); // Case-insensitive search
    otherFilters.$or = [{ title: searchRegex }, { sub_title: searchRegex }, { description: searchRegex }];
  }

  // Handle price range filtering
  if (price_from || price_to) {
    otherFilters.price_real = {};
    if (price_from) {
      otherFilters.price_real.$gte = Number(price_from);
    }
    if (price_to) {
      otherFilters.price_real.$lte = Number(price_to);
    }
  }

  const courses = await Course.paginate(otherFilters, options);

  return courses;
};

const getAllCourses = async ({ query }) => {
  // Build the filter object
  const filter = { course_status: true };

  // Extract pagination options
  const options = {
    limit: query.limit ? parseInt(query.limit, 10) : 10,
    page: query.page ? parseInt(query.page, 10) : 1,
    sortBy: query.sortBy || 'createdAt:desc',
    populate: 'tumbnail_image,course_category,coach_id',
  };

  // 1. Search filter (q) - search in title and sub_title
  if (query.q && query.q.trim()) {
    const searchRegex = new RegExp(query.q.trim(), 'i');
    filter.$or = [{ title: searchRegex }, { sub_title: searchRegex }];
  }

  // 3. Course category filter
  if (query.course_category) {
    if (Array.isArray(query.course_category)) {
      filter.course_category = { $in: query.course_category };
    } else {
      filter.course_category = query.course_category;
    }
  }

  // 4. Coach filter
  if (query.coach_id) {
    filter.coach_id = query.coach_id;
  }

  // filter fire sale
  if (query.is_fire_sale) {
    filter.is_fire_sale = true;
  }

  // 2. Price range filter with simplified logic
  if (query.price_from || query.price_to) {
    const priceConditions = [];

    // Condition for fire sale courses (use price_discount)
    const fireSaleCondition = {
      is_fire_sale: true,
      price_discount: { $exists: true, $ne: null },
    };

    // Condition for regular courses (use price_real)
    const regularCondition = {
      $or: [{ is_fire_sale: { $ne: true } }, { price_discount: { $exists: false } }, { price_discount: null }],
    };

    if (query.price_from) {
      const minPrice = Number(query.price_from);

      priceConditions.push({
        $or: [
          // Fire sale courses with discount >= minPrice
          {
            ...fireSaleCondition,
            price_discount: { $gte: minPrice },
          },
          // Regular courses with price_real >= minPrice
          {
            ...regularCondition,
            price_real: { $gte: minPrice },
          },
        ],
      });
    }

    if (query.price_to) {
      const maxPrice = Number(query.price_to);

      priceConditions.push({
        $or: [
          // Fire sale courses with discount <= maxPrice
          {
            ...fireSaleCondition,
            price_discount: { $lte: maxPrice },
          },
          // Regular courses with price_real <= maxPrice
          {
            ...regularCondition,
            price_real: { $lte: maxPrice },
          },
        ],
      });
    }

    // Combine all price conditions
    if (priceConditions.length > 0) {
      filter.$and = (filter.$and || []).concat(priceConditions);
    }
  }

  console.log({ filter });

  // Use the paginate plugin
  const result = await Course.paginate(filter, options);

  return result;
};

const getCourseBySlugOrId = async (identifier) => {
  // const query = identifier._id ? { _id: identifier._id } : { slug: identifier.slug };
  // console.log(identifier);
  return await Course.findOne(identifier);
};

const createCourse = async (courseData) => {
  const course = new Course(courseData);
  return await course.save();
};

const updateCourse = async (courseId, updatedData) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  Object.assign(course, updatedData);
  await course.save();

  return course;
};

const deleteCourse = async (courseId) => {
  const course = await Course.findById(courseId);
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  await course.deleteOne();
};

// Send Private Course File
const sendFileDirectly = async (res, fileName) => {
  const filePath = path.join(__dirname, '../../..', 'storage', fileName);

  // Validate file path to prevent directory traversal
  if (!isSafePath(filePath)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid file path');
  }

  res.setHeader('Content-Type', 'video/mp4');
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
};

// Access verification function
const verifyCourseAccess = async (userId, courseId) => {
  // get user profile
  const profile = await Profile.findOne({ user: userId });

  // check if Profile not Exist
  if (!profile) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // check if User Have Access to this course
  const userCourseAccess = profile.courses.includes(courseId);

  // console.log({ userCourseAccess });

  return !!userCourseAccess;
  // Implement your access logic, example:
  // const enrollment = await Enrollment.findOne({
  //   user: userId,
  //   course: courseId,
  //   status: 'ACTIVE'
  // });

  // return !!enrollment;
};

// Course Category

const getAllCategories = async () => {
  return CourseCategory.find({}).populate('subCategoriesDetails');
};

const createCategory = async (categoryBody) => {
  const category = await CourseCategory.findOne({ name: categoryBody.name });

  if (category) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Category already exists');
  }
  return CourseCategory.create(categoryBody);
};

const getSubCategories = async (categoryId) => {
  const category = await CourseCategory.findById(categoryId).populate('subCategoriesDetails');
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  return category.subCategoriesDetails;
};

const createSubCategory = async ({ categoryId, name }) => {
  const category = await CourseCategory.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Parent category not found');
  }

  const subCategory = await SubCategory.create({
    name,
    parentCategory: categoryId,
  });

  // Add subcategory to parent
  category.subCategories.push(subCategory._id);
  await category.save();

  return subCategory;
};

// const getAllCourseCategories = async () => {
//   return await CourseCategory.find();
// };

// const createCourseCategory = async (courseData) => {
//   const newCategory = new CourseCategory(courseData);
//   return await newCategory.save();
// };

module.exports = {
  // ADMIN
  getAllCoursesForAdmin,
  getAllCourses,
  getCourseBySlugOrId,
  createCourse,
  applyForCourse,
  deleteCourse,
  updateCourse,
  sendFileDirectly,
  verifyCourseAccess,
  // categories
  getAllCategories,
  createCategory,
  getSubCategories,
  createSubCategory,
};

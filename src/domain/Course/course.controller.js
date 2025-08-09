const httpStatus = require('http-status');
const mongoose = require('mongoose');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const pick = require('../../utils/pick');

const courseService = require('./course.service');
const { Course }  = require('./course.model');
const Upload = require('../../services/uploader/uploader.model');


// ADMIN
const getAllCoursesForAdmin = catchAsync(async (req, res) => {

  if (!req.user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User Not Exist');
  }

  const filter = pick(req.query, ['title', 'subtitle', 'q', '_id', 'price_from', 'price_to']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const courses = await courseService.getAllCoursesForAdmin({ filter, options });
  res.status(httpStatus.OK).send(courses);
});

const getAllCourses = catchAsync(async (req, res) => {
  const courses = await courseService.getAllCourses({query: req.query});
  res.status(httpStatus.OK).send(courses);
});

const getCourseBySlugOrId = catchAsync(async (req, res) => {

  const {slug} = req.params;

  if (!slug) throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Course ID or Slug');

  const isObjectId = mongoose.Types.ObjectId.isValid(req.params?.slug) &&
                   new mongoose.Types.ObjectId(req.params?.slug).toString() === req.params?.slug;

  console.log({identifier: mongoose.Types.ObjectId.isValid(req.params?.slug)})
  const identifier = isObjectId
    ? { _id: slug }
    : { slug };

  const course = await courseService.getCourseBySlugOrId(identifier);
  res.status(httpStatus.OK).send(course);
});

const createCourse = catchAsync(async (req, res) => {
  const newCourse = await courseService.createCourse(req.body);
  res.status(httpStatus.CREATED).send(newCourse);
});

const applyForCourse = catchAsync(async (req, res) => {
  const { course_id } = req.params;
  const { user_id } = req.body;

  const updatedCourse = await courseService.applyForCourse({
    courseId: course_id,
    userId: user_id,
  });

  res.status(httpStatus.OK).send({
    message: 'User successfully applied to the course.',
    course: updatedCourse,
  });
});

const updateCourse = catchAsync(async (req, res) => {
  const courseId = req.params.course_id;
  const updatedData = req.body;

  const updatedCourse = await courseService.updateCourse(courseId, updatedData);
  res.status(httpStatus.OK).send(updatedCourse);
});

const deleteCourse = catchAsync(async (req, res) => {
  const courseId = req.params.course_id;

  await courseService.deleteCourse(courseId);
  res.status(httpStatus.NO_CONTENT).send();
});



// Get Private Course files


const getCoursePrivateFile = catchAsync(async (req, res) => {
  const { fileId } = req.params;
  const userId = req.user?.id; // From authentication middleware

  if (!userId || !fileId) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Unauthorized');
  }

  // Find the file metadata
  const fileDoc = await Upload.findById(fileId);
  if (!fileDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'File not found');
  }

  // Find the associated course
  const course = await Course.findOne({
    'course_objects.files': fileId
  }).populate('course_objects.files');

  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found');
  }

  // Find the specific course object
  const courseObject = course.course_objects.find(obj =>
    obj.files._id.equals(fileId)
  );

  //  Check file accessibility
  if (courseObject.status === 'PUBLIC') {
    // return file if it PUBLIC
    return courseService.sendFileDirectly(res, fileDoc.file_name);
  }

  //  Verify user access for private files
  const hasAccess = await courseService.verifyCourseAccess(userId, course._id);


  if (!hasAccess) {
      throw new ApiError(httpStatus[403], 'Access denied');
  }

  //  Send the file if all checks pass
  courseService.sendFileDirectly(res, fileDoc.file_name);

});

// Course  Category

const getAllCategories = catchAsync(async (req, res) => {
  const categories = await courseService.getAllCategories();
  res.status(httpStatus.OK).send(categories);
});


const createCategory = catchAsync(async (req, res) => {
  const category = await courseService.createCategory(req.body);
  res.status(httpStatus.CREATED).send(category);
});


const getSubCategories = catchAsync(async (req, res) => {

  const { categoryId } = req.params;
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found or not valid');
  }

  const subCategories = await courseService.getSubCategories(categoryId);
  if (!subCategories) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found');
  }
  res.status(httpStatus.OK).send(subCategories);
});



const createSubCategory = catchAsync(async (req, res) => {

   const { categoryId } = req.params;
  if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Category not found or not valid');
  }

  const subCategory = await courseService.createSubCategory({
    categoryId: categoryId,
    name: req.body.name
  });
  res.status(httpStatus.CREATED).send(subCategory);
});



// const getAllCourseCategories = catchAsync(async (req, res) => {
//   const courseCategory = await courseService.getAllCourseCategories();
//   res.status(httpStatus.OK).send(courseCategory);
// });


// const createCourseCategory = catchAsync(async (req, res) => {
//   const newCourseCategory = await courseService.createCourseCategory(req.body);
//   res.status(httpStatus.CREATED).send(newCourseCategory);
// });


module.exports = {
  // admin
  getAllCoursesForAdmin,
  getAllCourses,
  getCourseBySlugOrId,
  createCourse,
  applyForCourse,
  updateCourse,
  deleteCourse,
  getCoursePrivateFile,
  // categories
  getAllCategories,
  createCategory,
  getSubCategories,
  createSubCategory

};

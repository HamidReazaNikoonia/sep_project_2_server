/* eslint-disable no-restricted-syntax */
const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');
const Upload = require('../../services/uploader/uploader.model');

const { Schema } = mongoose;

// Category Schema

// const SubCategorySchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     parentCategory: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Course_Category',
//       required: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const CourseCategorySchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//       unique: true,
//     },
//     isRoot: {
//       type: Boolean,
//       default: true,
//     },
//     subCategories: [
//       {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Sub_Category',
//       },
//     ],
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    sub_title: String,
    description: String,
    description_long: String,
    tumbnail_image: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Upload',
      autopopulate: true,
    },
    sample_media: {
      type: [
        {
          media_type: String,
          media_title: String,
          url_address: String,
          file: {
            type: Schema.Types.ObjectId,
            ref: 'Upload',
            autopopulate: true,
          },
        },
      ],
      required: true,
      validate: {
        validator: (array) => array.length > 0, // Ensures at least one object exists in the array
        message: 'At least one sample media is required.',
      },
    },
    price_real: {
      type: Number,
      required: true,
      min: [10000, 'Price must be at least 10,000.'], // Minimum value
    },
    price_discount: {
      type: Number,
      required: false,
      min: [10000, 'Price must be at least 10,000.'], // Minimum value
    },
    is_fire_sale: {
      type: Boolean,
      default: false,
    },
    member: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    max_member_accept: {
      type: Number,
      default: 10,
      min: [1, 'Max members must be at least 1.'], // Minimum value
      validate: {
        validator: (value) => Number.isInteger(value),
        message: 'Max members must be an integer.',
      },
    },
    course_language: String,
    course_duration: Number,
    course_type: {
      type: String,
      required: false,
      enum: ['HOZORI', 'OFFLINE'],
    },
    course_subject_header: Number,
    educational_level: Number,
    is_have_licence: {
      type: Boolean,
      default: false,
    },
    course_views: Number,
    score: Number,
    course_category: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Course_Category',
        autopopulate: true,
      },
    ],
    coach_id: {
      type: Schema.Types.ObjectId,
      ref: 'Coach',
      autopopulate: true,
    },
    course_objects: [
      {
        subject_title: String,
        description: String,
        order: Number,
        lessons: [
          {
            title: String,
            description: String,
            order: Number,
            status: {
              type: String,
              enum: ['PUBLIC', 'PRIVATE'],
              default: 'PRIVATE',
            },
            duration: Number, // minute
            file: {
              type: Schema.Types.ObjectId,
              ref: 'Upload',
              autopopulate: true,
            },
          },
        ],
        duration: Number, // minute
        files: {
          type: Schema.Types.ObjectId,
          ref: 'Upload',
          autopopulate: true,
        },
      },
    ],
    course_status: {
      type: Boolean,
      default: true,
    },
    slug: String,
    course_expire: Boolean,
  },
  {
    timestamps: true,
  }
);

// Create a text index for better search performance
courseSchema.index({ title: 'text', sub_title: 'text' });

// Pre-save hook
courseSchema.pre('save', async function (next) {
  const course = this;

  if (course.isNew && course.sample_media) {
    for (const media of course.sample_media) {
      if (media.file) {
        // Fetch the Upload document by its ObjectId
        // eslint-disable-next-line no-await-in-loop
        const uploadDoc = await Upload.findById(media.file);
        if (uploadDoc) {
          // Generate a new URL using the file name
          const fileName = uploadDoc.file_name || ''; // Adjust field name to match your Upload model
          const generatedUrl = `http://localhost:9000/file/${fileName}`;
          media.url_address = generatedUrl; // Assign the generated URL
        }
      }
    }
  }

  next(); // Proceed to save the document
});

// Virtual populate to get all subcategories when querying
// CourseCategorySchema.virtual('subCategoriesDetails', {
//   ref: 'Sub_Category',
//   localField: '_id',
//   foreignField: 'parentCategory',
// });

courseSchema.plugin(require('mongoose-autopopulate'));

// add plugin that converts mongoose to json
courseSchema.plugin(toJSON);
courseSchema.plugin(paginate);

const Course = mongoose.model('Course', courseSchema);
// const CourseCategory = mongoose.model('Course_Category', CourseCategorySchema);
// const SubCategory = mongoose.model('Sub_Category', SubCategorySchema);

module.exports = { Course };

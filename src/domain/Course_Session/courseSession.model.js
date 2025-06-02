/* eslint-disable no-restricted-syntax */
const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');
const Upload = require('../../services/uploader/uploader.model');

const { Schema } = mongoose;

// Category Schema

const SubCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course_Category',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const CourseCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    isRoot: {
      type: Boolean,
      default: true,
    },
    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sub_Category',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const courseSessionSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    sub_title: String,
    description: String,
    description_long: String,
    tumbnail: {
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
      required: false,
    },
    price: {
      type: Number,
      required: true,
      min: [10000, 'Price must be at least 10,000.'], // Minimum value
    },
    member: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],
    course_language: String,
    course_duration: Number,
    course_type: {
      type: String,
      required: true,
      enum: ['HOZORI', 'ONLINE', 'BOTH'],
    },
    educational_level: Number,
    is_have_licence: {
      type: Boolean,
      default: false,
    },
    course_views: Number,
    score: Number,
    course_session_category: {
      type: Schema.Types.ObjectId,
      ref: 'Course_Session_Category',
      autopopulate: true,
    },
    course_session_sub_category: {
      type: Schema.Types.ObjectId,
      ref: 'Course_Session_Sub_Category',
      autopopulate: true,
    },
    coaches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: false,
        autopopulate: true,
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
courseSessionSchema.index({ title: 'text', sub_title: 'text' });

// Pre-save hook
courseSessionSchema.pre('save', async function (next) {
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
CourseCategorySchema.virtual('subCategoriesDetails', {
  ref: 'Course_Session_Sub_Category',
  localField: '_id',
  foreignField: 'parentCategory',
});

courseSessionSchema.plugin(require('mongoose-autopopulate'));

// add plugin that converts mongoose to json
courseSessionSchema.plugin(toJSON);
courseSessionSchema.plugin(paginate);

// Indexes for better query performance
// courseSessionSchema.index({ coaches: 1 });
// courseSessionSchema.index({ 'sessions.coach': 1 });
// courseSessionSchema.index({ 'sessions.date': 1 });

const CourseSession = mongoose.model('Course_Session', courseSessionSchema);
const CourseSessionCategory = mongoose.model('Course_Session_Category', CourseCategorySchema);
const CourseSessionSubCategory = mongoose.model('Course_Session_Sub_Category', SubCategorySchema);

module.exports = { CourseSession, CourseSessionCategory, CourseSessionSubCategory };

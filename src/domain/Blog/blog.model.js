const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

// Function to calculate reading time
function calculateReadingTime(content) {
  // Average reading speed is typically 200-250 words per minute
  const WORDS_PER_MINUTE = 225;

  // Remove extra whitespace and split into words
  const wordCount = content.trim().split(/\s+/).length;

  // Calculate reading time in minutes, rounding up
  const readingTimeMinutes = Math.ceil(wordCount / WORDS_PER_MINUTE);

  return readingTimeMinutes;
}

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    sub_title: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    content: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Upload',
      autopopulate: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming you have a User model
      required: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    readingTime: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins for JSON transformation and pagination
blogSchema.plugin(toJSON);
blogSchema.plugin(paginate);

// Pre-save middleware to calculate reading time
blogSchema.pre('save', function (next) {
  // Only calculate reading time if content has been modified
  if (this.isModified('content')) {
    this.readingTime = calculateReadingTime(this.content);
  }
  next();
});

// Optional: Add a method to get a formatted blog post
blogSchema.methods.getFormattedBlog = function () {
  return {
    id: this._id,
    title: this.title,
    subTitle: this.sub_title,
    content: this.content,
    thumbnail: this.thumbnail,
    author: this.author,
    tags: this.tags,
    createdAt: this.createdAt,
    readingTime: this.readingTime,
  };
};

// Optional: Add a static method to find blogs by tag
blogSchema.statics.findByTag = function (tag) {
  return this.find({ tags: tag });
};

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;

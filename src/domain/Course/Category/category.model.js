const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../../models/plugins');

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course_Category',
      default: null,
      // autopopulate: true,
    },
    path: {
      type: String,
      index: true,
    },
    path_name: {
      type: String,
      index: true,
    },
    level: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add plugins
categorySchema.plugin(toJSON);
categorySchema.plugin(paginate);

categorySchema.plugin(require('mongoose-autopopulate'));

// Pre-save hook to set path and level
categorySchema.pre('save', async function (next) {
  const category = this;

  if (category.isModified('parent')) {
    if (category.parent) {
      const parent = await category.constructor.findById(category.parent);
      category.level = parent.level + 1;
      category.path = parent.path ? `${parent.path},${category._id}` : `${parent._id},${category._id}`;
      category.path_name = parent.path_name ? `${parent.path_name},${category.name}` : `${parent.name},${category.name}`;
    } else {
      category.level = 0;
      category.path = category._id.toString();
      category.path_name = category.name;
    }
  }

  next();
});

// Static method to check if name is taken
categorySchema.statics.isNameTaken = async function (name, excludeCategoryId) {
  const category = await this.findOne({
    name,
    _id: { $ne: excludeCategoryId },
  });
  return !!category;
};

// Static method for tree building
categorySchema.statics.buildTree = async function () {
  const categories = await this.find({});
  const map = {};
  const roots = [];

  categories.forEach((category) => {
    map[category._id] = { ...category.toObject(), children: [] };
  });

  categories.forEach((category) => {
    if (category.parent && map[category.parent]) {
      map[category.parent].children.push(map[category._id]);
    } else {
      roots.push(map[category._id]);
    }
  });

  return roots;
};

const Category = mongoose.model('Course_Category', categorySchema);
module.exports = Category;

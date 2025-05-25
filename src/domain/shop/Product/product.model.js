const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../../models/plugins');

const objectId = mongoose.Types.ObjectId;

// Enum Constant
const productTypesEnum = ['publish', 'draft', 'rejected'];

// Review Schema
const reviewSchema = mongoose.Schema(
  {
    product: { type: objectId, ref: 'Product' },
    name: { type: String, required: true },
    // Individual rating
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must can not be more than 5'],
      required: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
    comment: { type: String, required: true },
    user: {
      type: objectId, // Gets id of User
      required: false,
      ref: 'User', // Adds relationship between Review and User
    },
  },
  {
    timestamps: true,
  }
);

// Collection Schema
const collectionSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: Boolean,
      default: true,
    },
    product: [
      {
        type: objectId, // Gets id of Product
        ref: 'Product', // Adds relationship between Review and User
        autopopulate: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Category Schema
const CategorySchema = mongoose.Schema(
  {
    name: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Create Product Schema
const productSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    subtitle: {
      type: String,
      required: true,
    },
    meta_title: {
      type: String,
      required: false,
    },
    meta_description: {
      type: String,
      required: false,
    },
    slug: {
      type: String,
      required: false,
    },
    description: {
      type: String,
      required: true,
    },
    images: [
      {
        type: objectId,
        ref: 'Upload',
        required: false,
        autopopulate: true,
      },
    ],
    thumbnail: {
      type: objectId,
      ref: 'Upload',
      required: false,
      autopopulate: true,
    },
    brand: {
      type: String,
      required: false,
    },
    category: {
      type: objectId,
      ref: 'Category',
      required: false,
      autopopulate: true,
    },
    average_rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [10, 'Rating must can not be more than 10'],
    },

    price: {
      type: Number,
      required: true,
      default: 0,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
    is_available: {
      type: Boolean,
      default: true,
    },
    is_giftcard: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: productTypesEnum,
      default: 'publish',
    },
    qr_code: String,
    // product details
    product_details: {
      variants: {
        type: String,
      },
      width: Number,
      height: Number,
      length: Number,
      origin_country: String,
      material: String,
    },
    tag: [
      {
        name: String,
      },
    ],
    discountable: {
      status: Boolean,
      percent: Number,
    },

    // Web e-commerce
    publish_on_website: Boolean,

    // Social Media
    publish_on_social: {
      instagram: {
        publish: Boolean,
        post_id: String,
        post_url: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Create a text index for better search performance
productSchema.index({ title: 'text', sub_title: 'text' });

// add plugin that converts mongoose to json
productSchema.plugin(toJSON);
productSchema.plugin(paginate);

productSchema.plugin(require('mongoose-autopopulate'));

productSchema.virtual('url').get(function () {
  return `/product/${this._id}`;
});

// Inner Model
const Collection = mongoose.model('Collection', collectionSchema);
const Category = mongoose.model('Category', CategorySchema);
const Product = mongoose.model('Product', productSchema);
const ProductReview = mongoose.model('ProductReview', reviewSchema);

module.exports = {
  Product,
  ProductReview,
  Collection,
  Category,
};

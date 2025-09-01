const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

const { Schema } = mongoose;

// Campaign Type Enum (shared between Campaign and Offer)
const campaignTypeEnum = ['Course', 'Course-Session', 'ClassProgram', 'Product'];

// Campaign Status Enum
const campaignStatusEnum = ['draft', 'active', 'paused', 'completed', 'cancelled'];

// Offer Status Enum
const offerStatusEnum = ['draft', 'active', 'inactive', 'expired'];

// Discount Type Enum
const discountTypeEnum = ['percentage', 'fixed_amount'];

// Target Audience Schema
const targetAudienceSchema = new Schema({
  userType: {
    type: String,
    enum: ['all', 'new_users', 'existing_users', 'premium_users'],
    default: 'all',
  },
  minAge: {
    type: Number,
    min: 0,
    max: 100,
  },
  maxAge: {
    type: Number,
    min: 0,
    max: 100,
  },
  location: {
    cities: [String],
    provinces: [String],
  },
  previousPurchases: {
    hasAnyPurchase: Boolean,
    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        refPath: 'targetAudience.previousPurchases.categoryType',
      },
    ],
    categoryType: {
      type: String,
      enum: ['Course_Category', 'Product_Category', 'CourseSession_Category'],
    },
  },
});

// Campaign Items Schema - References to different content types
const campaignItemSchema = new Schema(
  {
    itemType: {
      type: String,
      enum: campaignTypeEnum,
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'items.itemType',
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    campaignPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    maxQuantity: {
      type: Number,
      min: 1,
      default: null, // null means unlimited
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

// Offer Items Schema - Same structure as campaign items but for offers
const offerItemSchema = new Schema(
  {
    itemType: {
      type: String,
      enum: campaignTypeEnum,
      required: true,
    },
    itemId: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: 'items.itemType',
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    offerPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    maxQuantity: {
      type: Number,
      min: 1,
      default: null, // null means unlimited
    },
    soldQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: true }
);

// Campaign Analytics Schema
const campaignAnalyticsSchema = new Schema({
  totalViews: { type: Number, default: 0 },
  totalClicks: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  clickThroughRate: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

// Offer Analytics Schema (simpler than campaign)
const offerAnalyticsSchema = new Schema({
  totalViews: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

// Main Campaign Schema
const campaignSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 250,
    },

    // Campaign Type
    type: {
      type: String,
      enum: campaignTypeEnum,
      required: true,
    },

    // Campaign Status
    status: {
      type: String,
      enum: campaignStatusEnum,
      default: 'draft',
    },

    // Campaign Timing
    startDate: {
      type: Date,
      required: true,
      validate: {
        validator(date) {
          if (this.isNew) {
            return date >= new Date();
          }
          return true;
        },
        message: 'Start date must be in the future for new campaigns',
      },
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(date) {
          return date > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },

    // Display Settings
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },

    // Visual Elements
    bannerImage: {
      type: Schema.Types.ObjectId,
      ref: 'Upload',
    },
    thumbnailImage: {
      type: Schema.Types.ObjectId,
      ref: 'Upload',
    },
    galleryImages: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Upload',
      },
    ],

    // Campaign Colors and Styling
    primaryColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#FF6B6B',
    },
    secondaryColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#4ECDC4',
    },

    // Target Audience
    targetAudience: targetAudienceSchema,

    // Campaign Items (Products, Courses, etc.)
    items: [campaignItemSchema],

    // Discount Settings
    globalDiscount: {
      isEnabled: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        enum: discountTypeEnum,
        default: 'percentage',
      },
      value: {
        type: Number,
        min: 0,
      },
      maxDiscountAmount: {
        type: Number,
        min: 0,
      },
    },

    // Purchase Limits
    limitPerUser: {
      type: Number,
      min: 1,
      default: null, // null means unlimited
    },
    totalLimit: {
      type: Number,
      min: 1,
      default: null, // null means unlimited
    },

    // SEO and Marketing
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    metaTitle: {
      type: String,
      maxlength: 60,
    },
    metaDescription: {
      type: String,
      maxlength: 160,
    },
    tags: [String],

    // Social Media Integration
    socialMedia: {
      shareText: String,
      hashtags: [String],
      socialImage: {
        type: Schema.Types.ObjectId,
        ref: 'Upload',
      },
    },

    // Campaign Creator and Management
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    managedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // Analytics
    analytics: campaignAnalyticsSchema,

    // Terms and Conditions
    termsAndConditions: {
      type: String,
      maxlength: 2000,
    },

    // Auto-activation and deactivation
    autoActivate: {
      type: Boolean,
      default: false,
    },
    autoDeactivate: {
      type: Boolean,
      default: true,
    },

    // Notification Settings
    notifications: {
      emailNotification: {
        type: Boolean,
        default: true,
      },
      smsNotification: {
        type: Boolean,
        default: false,
      },
      pushNotification: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Offer Schema - Independent collection-style offers for website display
const offerSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    shortDescription: {
      type: String,
      trim: true,
      maxlength: 150,
    },

    // Offer Type - same enum as campaigns
    type: {
      type: String,
      enum: campaignTypeEnum,
      required: true,
    },

    // Offer Items (Products, Courses, etc.) - same structure as campaigns
    items: [offerItemSchema],

    // Offer Category/Style
    offerStyle: {
      type: String,
      enum: ['flash_sale', 'early_bird', 'bundle', 'seasonal', 'clearance', 'featured'],
      required: true,
    },

    // Timing
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(date) {
          return date > this.startDate;
        },
        message: 'End date must be after start date',
      },
    },

    // Display Settings
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    showOnHomepage: {
      type: Boolean,
      default: false,
    },

    // Status
    status: {
      type: String,
      enum: offerStatusEnum,
      default: 'draft',
    },

    // Visual Elements (simpler than campaigns)
    bannerImage: {
      type: Schema.Types.ObjectId,
      ref: 'Upload',
    },
    thumbnailImage: {
      type: Schema.Types.ObjectId,
      ref: 'Upload',
    },

    // Styling
    backgroundColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#FF4757',
    },
    textColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#FFFFFF',
    },

    // Badge/Label
    badgeText: {
      type: String,
      maxlength: 30,
    },
    badgeColor: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#FF6B6B',
    },

    // Purchase Limits
    limitPerUser: {
      type: Number,
      min: 1,
      default: null,
    },
    totalLimit: {
      type: Number,
      min: 1,
      default: null,
    },

    // Basic SEO
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    tags: [String],

    // Analytics (simpler than campaigns)
    analytics: offerAnalyticsSchema,

    // Creator
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // Terms (optional and shorter than campaigns)
    terms: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual fields for Campaign
campaignSchema.virtual('isRunning').get(function () {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now && this.isActive;
});

campaignSchema.virtual('timeRemaining').get(function () {
  const now = new Date();
  if (this.endDate > now) {
    return Math.max(0, this.endDate - now);
  }
  return 0;
});

campaignSchema.virtual('totalItems').get(function () {
  return this.items ? this.items.length : 0;
});

campaignSchema.virtual('totalSold').get(function () {
  return this.items ? this.items.reduce((sum, item) => sum + item.soldQuantity, 0) : 0;
});

// Virtual fields for Offer
offerSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'active' && this.startDate <= now && this.endDate >= now && this.isActive;
});

offerSchema.virtual('timeRemaining').get(function () {
  const now = new Date();
  if (this.endDate > now) {
    return Math.max(0, this.endDate - now);
  }
  return 0;
});

offerSchema.virtual('totalItems').get(function () {
  return this.items ? this.items.length : 0;
});

offerSchema.virtual('totalSold').get(function () {
  return this.items ? this.items.reduce((sum, item) => sum + item.soldQuantity, 0) : 0;
});

offerSchema.virtual('averageDiscount').get(function () {
  if (!this.items || this.items.length === 0) return 0;
  const totalDiscount = this.items.reduce((sum, item) => sum + (item.discountPercentage || 0), 0);
  return Math.round(totalDiscount / this.items.length);
});

// Indexes for Campaign
campaignSchema.index({ type: 1, status: 1 });
campaignSchema.index({ startDate: 1, endDate: 1 });
campaignSchema.index({ isActive: 1, isFeatured: 1 });
campaignSchema.index({ slug: 1 });
campaignSchema.index({ createdBy: 1 });
campaignSchema.index({ 'items.itemType': 1, 'items.itemId': 1 });
campaignSchema.index({ tags: 1 });

// Indexes for Offer
offerSchema.index({ type: 1, status: 1 });
offerSchema.index({ offerStyle: 1 });
offerSchema.index({ startDate: 1, endDate: 1 });
offerSchema.index({ isActive: 1, isFeatured: 1 });
offerSchema.index({ displayOrder: 1 });
offerSchema.index({ showOnHomepage: 1 });
offerSchema.index({ slug: 1 });
offerSchema.index({ createdBy: 1 });
offerSchema.index({ 'items.itemType': 1, 'items.itemId': 1 });
offerSchema.index({ tags: 1 });

// Pre-save middleware for Campaign
campaignSchema.pre('save', function (next) {
  // Auto-generate slug if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Calculate discount percentages for items
  if (this.items) {
    this.items.forEach((item) => {
      if (item.originalPrice && item.campaignPrice) {
        // eslint-disable-next-line no-param-reassign
        item.discountPercentage = Math.round(((item.originalPrice - item.campaignPrice) / item.originalPrice) * 100);
      }
    });
  }

  next();
});

// Pre-save middleware for Offer
offerSchema.pre('save', function (next) {
  // Auto-generate slug if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Calculate discount percentages for items
  if (this.items) {
    this.items.forEach((item) => {
      if (item.originalPrice && item.offerPrice) {
        // eslint-disable-next-line no-param-reassign
        item.discountPercentage = Math.round(((item.originalPrice - item.offerPrice) / item.originalPrice) * 100);
      }
    });
  }

  next();
});

// Plugins
campaignSchema.plugin(toJSON);
campaignSchema.plugin(paginate);
campaignSchema.plugin(require('mongoose-autopopulate'));

offerSchema.plugin(toJSON);
offerSchema.plugin(paginate);
offerSchema.plugin(require('mongoose-autopopulate'));

// Models
const Campaign = mongoose.model('Campaign', campaignSchema);
const Offer = mongoose.model('Offer', offerSchema);

module.exports = {
  Campaign,
  Offer,
  campaignTypeEnum,
  campaignStatusEnum,
  offerStatusEnum,
  discountTypeEnum,
};

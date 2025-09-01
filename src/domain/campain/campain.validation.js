const Joi = require('joi');
const { campaignTypeEnum, campaignStatusEnum, offerStatusEnum } = require('./campain.model');

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);

const campaignItemSchema = Joi.object({
  itemType: Joi.string()
    .valid(...campaignTypeEnum)
    .required(),
  itemId: objectId.required(),
  originalPrice: Joi.number().min(0).required(),
  campaignPrice: Joi.number().min(0).required(),
  maxQuantity: Joi.number().min(1).allow(null),
  isActive: Joi.boolean().default(true),
});

const offerItemSchema = Joi.object({
  itemType: Joi.string()
    .valid(...campaignTypeEnum)
    .required(),
  itemId: objectId.required(),
  originalPrice: Joi.number().min(0).required(),
  offerPrice: Joi.number().min(0).required(),
  maxQuantity: Joi.number().min(1).allow(null),
  isActive: Joi.boolean().default(true),
  displayOrder: Joi.number().default(0),
});

const targetAudienceSchema = Joi.object({
  userType: Joi.string().valid('all', 'new_users', 'existing_users', 'premium_users').default('all'),
  minAge: Joi.number().min(0).max(100),
  maxAge: Joi.number().min(0).max(100),
  location: Joi.object({
    cities: Joi.array().items(Joi.string()),
    provinces: Joi.array().items(Joi.string()),
  }),
  previousPurchases: Joi.object({
    hasAnyPurchase: Joi.boolean(),
    categoryIds: Joi.array().items(objectId),
    categoryType: Joi.string().valid('Course_Category', 'Product_Category', 'CourseSession_Category'),
  }),
});

const createCampaign = {
  body: Joi.object({
    title: Joi.string().required().max(200).trim(),
    description: Joi.string().required().max(1000).trim(),
    shortDescription: Joi.string().max(250).trim(),
    type: Joi.string()
      .valid(...campaignTypeEnum)
      .required(),
    status: Joi.string()
      .valid(...campaignStatusEnum)
      .default('draft'),
    startDate: Joi.date().min('now').required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    isActive: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false),
    priority: Joi.number().min(0).max(10).default(0),
    bannerImage: objectId,
    thumbnailImage: objectId,
    galleryImages: Joi.array().items(objectId),
    primaryColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    secondaryColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    targetAudience: targetAudienceSchema,
    items: Joi.array().items(campaignItemSchema).required(),
    globalDiscount: Joi.object({
      isEnabled: Joi.boolean().default(false),
      type: Joi.string().valid('percentage', 'fixed_amount').default('percentage'),
      value: Joi.number().min(0),
      maxDiscountAmount: Joi.number().min(0),
    }),
    limitPerUser: Joi.number().min(1).allow(null),
    totalLimit: Joi.number().min(1).allow(null),
    slug: Joi.string().lowercase().trim(),
    metaTitle: Joi.string().max(60),
    metaDescription: Joi.string().max(160),
    tags: Joi.array().items(Joi.string()),
    socialMedia: Joi.object({
      shareText: Joi.string(),
      hashtags: Joi.array().items(Joi.string()),
      socialImage: objectId,
    }),
    managedBy: Joi.array().items(objectId),
    termsAndConditions: Joi.string().max(2000),
    autoActivate: Joi.boolean().default(false),
    autoDeactivate: Joi.boolean().default(true),
    notifications: Joi.object({
      emailNotification: Joi.boolean().default(true),
      smsNotification: Joi.boolean().default(false),
      pushNotification: Joi.boolean().default(true),
    }),
  }),
};

const updateCampaign = {
  params: Joi.object({
    campaignId: objectId.required(),
  }),
  body: Joi.object({
    title: Joi.string().max(200).trim(),
    description: Joi.string().max(1000).trim(),
    shortDescription: Joi.string().max(250).trim(),
    type: Joi.string().valid(...campaignTypeEnum),
    status: Joi.string().valid(...campaignStatusEnum),
    startDate: Joi.date(),
    endDate: Joi.date(),
    isActive: Joi.boolean(),
    isFeatured: Joi.boolean(),
    priority: Joi.number().min(0).max(10),
    bannerImage: objectId,
    thumbnailImage: objectId,
    galleryImages: Joi.array().items(objectId),
    primaryColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    secondaryColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    targetAudience: targetAudienceSchema,
    items: Joi.array().items(campaignItemSchema),
    globalDiscount: Joi.object({
      isEnabled: Joi.boolean(),
      type: Joi.string().valid('percentage', 'fixed_amount'),
      value: Joi.number().min(0),
      maxDiscountAmount: Joi.number().min(0),
    }),
    limitPerUser: Joi.number().min(1).allow(null),
    totalLimit: Joi.number().min(1).allow(null),
    slug: Joi.string().lowercase().trim(),
    metaTitle: Joi.string().max(60),
    metaDescription: Joi.string().max(160),
    tags: Joi.array().items(Joi.string()),
    socialMedia: Joi.object({
      shareText: Joi.string(),
      hashtags: Joi.array().items(Joi.string()),
      socialImage: objectId,
    }),
    managedBy: Joi.array().items(objectId),
    termsAndConditions: Joi.string().max(2000),
    autoActivate: Joi.boolean(),
    autoDeactivate: Joi.boolean(),
    notifications: Joi.object({
      emailNotification: Joi.boolean(),
      smsNotification: Joi.boolean(),
      pushNotification: Joi.boolean(),
    }),
  }).min(1),
};

const createOffer = {
  body: Joi.object({
    title: Joi.string().required().max(200).trim(),
    description: Joi.string().required().max(500).trim(),
    shortDescription: Joi.string().max(150).trim(),
    type: Joi.string()
      .valid(...campaignTypeEnum)
      .required(),
    items: Joi.array().items(offerItemSchema).required(),
    offerStyle: Joi.string().valid('flash_sale', 'early_bird', 'bundle', 'seasonal', 'clearance', 'featured').required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    isActive: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false),
    displayOrder: Joi.number().default(0),
    showOnHomepage: Joi.boolean().default(false),
    status: Joi.string()
      .valid(...offerStatusEnum)
      .default('draft'),
    bannerImage: objectId,
    thumbnailImage: objectId,
    backgroundColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    textColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    badgeText: Joi.string().max(30),
    badgeColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    limitPerUser: Joi.number().min(1).allow(null),
    totalLimit: Joi.number().min(1).allow(null),
    slug: Joi.string().lowercase().trim(),
    tags: Joi.array().items(Joi.string()),
    terms: Joi.string().max(500),
  }),
};

const updateOffer = {
  params: Joi.object({
    offerId: objectId.required(),
  }),
  body: Joi.object({
    title: Joi.string().max(200).trim(),
    description: Joi.string().max(500).trim(),
    shortDescription: Joi.string().max(150).trim(),
    type: Joi.string().valid(...campaignTypeEnum),
    items: Joi.array().items(offerItemSchema),
    offerStyle: Joi.string().valid('flash_sale', 'early_bird', 'bundle', 'seasonal', 'clearance', 'featured'),
    startDate: Joi.date(),
    endDate: Joi.date(),
    isActive: Joi.boolean(),
    isFeatured: Joi.boolean(),
    displayOrder: Joi.number(),
    showOnHomepage: Joi.boolean(),
    status: Joi.string().valid(...offerStatusEnum),
    bannerImage: objectId,
    thumbnailImage: objectId,
    backgroundColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    textColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    badgeText: Joi.string().max(30),
    badgeColor: Joi.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/),
    limitPerUser: Joi.number().min(1).allow(null),
    totalLimit: Joi.number().min(1).allow(null),
    slug: Joi.string().lowercase().trim(),
    tags: Joi.array().items(Joi.string()),
    terms: Joi.string().max(500),
  }).min(1),
};

const validateItems = {
  body: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          itemType: Joi.string()
            .valid(...campaignTypeEnum)
            .required(),
          itemId: objectId.required(),
        })
      )
      .required(),
    type: Joi.string()
      .valid(...campaignTypeEnum)
      .required(),
  }),
};

module.exports = {
  createCampaign,
  updateCampaign,
  createOffer,
  updateOffer,
  validateItems,
};

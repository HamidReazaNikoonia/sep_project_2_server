const httpStatus = require('http-status');
const mongoose = require('mongoose');
const { Campaign, Offer, campaignTypeEnum } = require('./campain.model');
const ApiError = require('../../utils/ApiError');
const APIFeatures = require('../../utils/APIFeatures');

// Import models based on campaign type for validation
const { Course } = require('../Course/course.model');
const { CourseSession } = require('../Course_Session/courseSession.model');
const { classProgramModel } = require('../Course_Session/classProgram.model');
const { Product } = require('../shop/Product/product.model');

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const getModelByType = (type) => {
  const modelMap = {
    Course,
    'Course-Session': CourseSession,
    ClassProgram: classProgramModel,
    Product,
  };
  return modelMap[type];
};

const validateItemsExistence = async (items, type) => {
  const Model = getModelByType(type);
  if (!Model) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid type: ${type}`);
  }

  const itemIds = items.map((item) => item.itemId);
  const existingItems = await Model.find({ _id: { $in: itemIds } }).select('_id');
  const existingIds = existingItems.map((item) => item._id.toString());

  const missingIds = itemIds.filter((id) => !existingIds.includes(id.toString()));

  if (missingIds.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Some ${type} items not found: ${missingIds.join(', ')}`);
  }

  return true;
};

const buildCampaignFilter = (filter, publicOnly = false) => {
  const query = {};

  if (publicOnly) {
    query.status = 'active';
    query.isActive = true;
    query.startDate = { $lte: new Date() };
    query.endDate = { $gte: new Date() };
  }

  if (filter.type && campaignTypeEnum.includes(filter.type)) {
    query.type = filter.type;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (typeof filter.isActive === 'boolean') {
    query.isActive = filter.isActive;
  }

  if (typeof filter.isFeatured === 'boolean') {
    query.isFeatured = filter.isFeatured;
  }

  if (filter.createdBy) {
    query.createdBy = filter.createdBy;
  }

  if (filter.tags && Array.isArray(filter.tags)) {
    query.tags = { $in: filter.tags };
  }

  if (filter.startDate) {
    query.startDate = { $gte: new Date(filter.startDate) };
  }

  if (filter.endDate) {
    query.endDate = { $lte: new Date(filter.endDate) };
  }

  if (filter.search) {
    query.$or = [
      { title: { $regex: filter.search, $options: 'i' } },
      { description: { $regex: filter.search, $options: 'i' } },
      { shortDescription: { $regex: filter.search, $options: 'i' } },
    ];
  }

  return query;
};

const buildOfferFilter = (filter, publicOnly = false) => {
  const query = {};

  if (publicOnly) {
    query.status = 'active';
    query.isActive = true;
    query.startDate = { $lte: new Date() };
    query.endDate = { $gte: new Date() };
  }

  if (filter.type && campaignTypeEnum.includes(filter.type)) {
    query.type = filter.type;
  }

  if (filter.status) {
    query.status = filter.status;
  }

  if (filter.offerStyle) {
    query.offerStyle = filter.offerStyle;
  }

  if (typeof filter.isActive === 'boolean') {
    query.isActive = filter.isActive;
  }

  if (typeof filter.isFeatured === 'boolean') {
    query.isFeatured = filter.isFeatured;
  }

  if (typeof filter.showOnHomepage === 'boolean') {
    query.showOnHomepage = filter.showOnHomepage;
  }

  if (filter.createdBy) {
    query.createdBy = filter.createdBy;
  }

  if (filter.tags && Array.isArray(filter.tags)) {
    query.tags = { $in: filter.tags };
  }

  if (filter.startDate) {
    query.startDate = { $gte: new Date(filter.startDate) };
  }

  if (filter.endDate) {
    query.endDate = { $lte: new Date(filter.endDate) };
  }

  if (filter.search) {
    query.$or = [
      { title: { $regex: filter.search, $options: 'i' } },
      { description: { $regex: filter.search, $options: 'i' } },
      { shortDescription: { $regex: filter.search, $options: 'i' } },
    ];
  }

  return query;
};

// =============================================================================
// PUBLIC SERVICES
// =============================================================================

const getActiveCampaigns = async ({ filter, options }) => {
  const query = buildCampaignFilter(filter, true);

  const apiFeatures = new APIFeatures(Campaign.find(query), { ...filter, ...options })
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const campaigns = await apiFeatures.query.populate([
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
    { path: 'items.itemId' },
  ]);

  const totalCount = await Campaign.countDocuments(query);

  return {
    results: campaigns,
    totalResults: totalCount,
    page: options.page || 1,
    limit: options.limit || 10,
  };
};

const getActiveOffers = async ({ filter, options }) => {
  const query = buildOfferFilter(filter, true);

  const apiFeatures = new APIFeatures(Offer.find(query), { ...filter, ...options }).filter().sort().limitFields().paginate();

  const offers = await apiFeatures.query
    .populate([
      { path: 'bannerImage', select: 'url filename' },
      { path: 'thumbnailImage', select: 'url filename' },
      { path: 'items.itemId' },
    ])
    .sort({ displayOrder: 1, createdAt: -1 });

  const totalCount = await Offer.countDocuments(query);

  return {
    results: offers,
    totalResults: totalCount,
    page: options.page || 1,
    limit: options.limit || 10,
  };
};

const getCampaignByQuery = async (query, options = {}) => {
  let campaignQuery = Campaign.findOne(query);

  if (options.publicOnly) {
    const publicFilter = {
      status: 'active',
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };
    campaignQuery = Campaign.findOne({ ...query, ...publicFilter });
  }

  const campaign = await campaignQuery.populate([
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
    { path: 'galleryImages', select: 'url filename' },
    { path: 'socialMedia.socialImage', select: 'url filename' },
    { path: 'items.itemId' },
    { path: 'createdBy', select: 'name email' },
  ]);

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  return campaign;
};

const getOfferByQuery = async (query, options = {}) => {
  let offerQuery = Offer.findOne(query);

  if (options.publicOnly) {
    const publicFilter = {
      status: 'active',
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    };
    offerQuery = Offer.findOne({ ...query, ...publicFilter });
  }

  const offer = await offerQuery.populate([
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
    { path: 'items.itemId' },
    { path: 'createdBy', select: 'name email' },
  ]);

  if (!offer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  return offer;
};

const getFeaturedCampaignsAndOffers = async (options = {}) => {
  const limit = options.limit || 10;
  const now = new Date();

  const [featuredCampaigns, featuredOffers] = await Promise.all([
    Campaign.find({
      isFeatured: true,
      status: 'active',
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate([
        { path: 'bannerImage', select: 'url filename' },
        { path: 'thumbnailImage', select: 'url filename' },
      ])
      .sort({ priority: -1, createdAt: -1 })
      .limit(Math.ceil(limit / 2)),

    Offer.find({
      isFeatured: true,
      status: 'active',
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate([
        { path: 'bannerImage', select: 'url filename' },
        { path: 'thumbnailImage', select: 'url filename' },
      ])
      .sort({ displayOrder: 1, createdAt: -1 })
      .limit(Math.floor(limit / 2)),
  ]);

  return {
    campaigns: featuredCampaigns,
    offers: featuredOffers,
  };
};

const getHomepageOffers = async (options = {}) => {
  const limit = options.limit || 6;
  const now = new Date();

  const offers = await Offer.find({
    showOnHomepage: true,
    status: 'active',
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
  })
    .populate([
      { path: 'bannerImage', select: 'url filename' },
      { path: 'thumbnailImage', select: 'url filename' },
    ])
    .sort({ displayOrder: 1, createdAt: -1 })
    .limit(limit);

  return offers;
};

// =============================================================================
// ADMIN SERVICES - CAMPAIGNS
// =============================================================================

const getAllCampaignsForAdmin = async ({ filter, options }) => {
  const query = buildCampaignFilter(filter, false);

  const apiFeatures = new APIFeatures(Campaign.find(query), { ...filter, ...options })
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const campaigns = await apiFeatures.query.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
  ]);

  const totalCount = await Campaign.countDocuments(query);

  return {
    results: campaigns,
    totalResults: totalCount,
    page: options.page || 1,
    limit: options.limit || 10,
  };
};

const getCampaignById = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId).populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'managedBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
    { path: 'galleryImages', select: 'url filename' },
    { path: 'socialMedia.socialImage', select: 'url filename' },
    { path: 'items.itemId' },
  ]);

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  return campaign;
};

const createCampaign = async (campaignData) => {
  // Validate campaign items if provided
  if (campaignData.items && campaignData.items.length > 0) {
    await validateItemsExistence(campaignData.items, campaignData.type);
  }

  const campaign = await Campaign.create(campaignData);
  return campaign.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
  ]);
};

const updateCampaign = async (campaignId, updateData) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  // Validate items if being updated
  if (updateData.items && updateData.items.length > 0) {
    const type = updateData.type || campaign.type;
    await validateItemsExistence(updateData.items, type);
  }

  Object.assign(campaign, updateData);
  await campaign.save();

  return campaign.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
  ]);
};

const deleteCampaign = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  await Campaign.findByIdAndDelete(campaignId);
  return true;
};

const updateCampaignStatus = async (campaignId, status) => {
  const campaign = await Campaign.findByIdAndUpdate(campaignId, { status }, { new: true, runValidators: true });

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  return campaign;
};

const getCampaignAnalytics = async (campaignId) => {
  const campaign = await Campaign.findById(campaignId).select('analytics');

  if (!campaign) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Campaign not found');
  }

  return campaign.analytics;
};

// =============================================================================
// ADMIN SERVICES - OFFERS
// =============================================================================

const getAllOffersForAdmin = async ({ filter, options }) => {
  const query = buildOfferFilter(filter, false);

  const apiFeatures = new APIFeatures(Offer.find(query), { ...filter, ...options }).filter().sort().limitFields().paginate();

  const offers = await apiFeatures.query.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
  ]);

  const totalCount = await Offer.countDocuments(query);

  return {
    results: offers,
    totalResults: totalCount,
    page: options.page || 1,
    limit: options.limit || 10,
  };
};

const getOfferById = async (offerId) => {
  const offer = await Offer.findById(offerId).populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
    { path: 'items.itemId' },
  ]);

  if (!offer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  return offer;
};

const createOffer = async (offerData) => {
  // Validate offer items if provided
  if (offerData.items && offerData.items.length > 0) {
    await validateItemsExistence(offerData.items, offerData.type);
  }

  const offer = await Offer.create(offerData);
  return offer.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
  ]);
};

const updateOffer = async (offerId, updateData) => {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  // Validate items if being updated
  if (updateData.items && updateData.items.length > 0) {
    const type = updateData.type || offer.type;
    await validateItemsExistence(updateData.items, type);
  }

  Object.assign(offer, updateData);
  await offer.save();

  return offer.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'bannerImage', select: 'url filename' },
    { path: 'thumbnailImage', select: 'url filename' },
  ]);
};

const deleteOffer = async (offerId) => {
  const offer = await Offer.findById(offerId);
  if (!offer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  await Offer.findByIdAndDelete(offerId);
  return true;
};

const updateOfferStatus = async (offerId, status) => {
  const offer = await Offer.findByIdAndUpdate(offerId, { status }, { new: true, runValidators: true });

  if (!offer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  return offer;
};

const getOfferAnalytics = async (offerId) => {
  const offer = await Offer.findById(offerId).select('analytics');

  if (!offer) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Offer not found');
  }

  return offer.analytics;
};

// =============================================================================
// UTILITY SERVICES
// =============================================================================

const bulkUpdateCampaigns = async (campaignIds, updateData) => {
  const validIds = campaignIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No valid campaign IDs provided');
  }

  const result = await Campaign.updateMany({ _id: { $in: validIds } }, updateData, { runValidators: true });

  return {
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
  };
};

const bulkUpdateOffers = async (offerIds, updateData) => {
  const validIds = offerIds.filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (validIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No valid offer IDs provided');
  }

  const result = await Offer.updateMany({ _id: { $in: validIds } }, updateData, { runValidators: true });

  return {
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
  };
};

const getStatistics = async () => {
  const [campaignStats, offerStats] = await Promise.all([
    Campaign.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          paused: { $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          featured: { $sum: { $cond: ['$isFeatured', 1, 0] } },
        },
      },
    ]),
    Offer.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          draft: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
          expired: { $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] } },
          featured: { $sum: { $cond: ['$isFeatured', 1, 0] } },
          homepage: { $sum: { $cond: ['$showOnHomepage', 1, 0] } },
        },
      },
    ]),
  ]);

  return {
    campaigns: campaignStats[0] || {
      total: 0,
      active: 0,
      draft: 0,
      paused: 0,
      completed: 0,
      featured: 0,
    },
    offers: offerStats[0] || {
      total: 0,
      active: 0,
      draft: 0,
      inactive: 0,
      expired: 0,
      featured: 0,
      homepage: 0,
    },
  };
};

const validateItems = async (items, type) => {
  try {
    await validateItemsExistence(items, type);
    return { valid: true, message: 'All items are valid' };
  } catch (error) {
    return { valid: false, message: error.message };
  }
};

module.exports = {
  // Public services
  getActiveCampaigns,
  getActiveOffers,
  getCampaignByQuery,
  getOfferByQuery,
  getFeaturedCampaignsAndOffers,
  getHomepageOffers,

  // Admin campaign services
  getAllCampaignsForAdmin,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  updateCampaignStatus,
  getCampaignAnalytics,

  // Admin offer services
  getAllOffersForAdmin,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  updateOfferStatus,
  getOfferAnalytics,

  // Utility services
  bulkUpdateCampaigns,
  bulkUpdateOffers,
  getStatistics,
  validateItems,
};

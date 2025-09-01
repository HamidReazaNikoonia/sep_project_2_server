const httpStatus = require('http-status');
const mongoose = require('mongoose');
const catchAsync = require('../../utils/catchAsync');
const ApiError = require('../../utils/ApiError');
const pick = require('../../utils/pick');
const campaignService = require('./campain.service');

// =============================================================================
// PUBLIC CONTROLLERS
// =============================================================================

const getActiveCampaigns = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['type', 'tags', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const campaigns = await campaignService.getActiveCampaigns({ filter, options });
  res.status(httpStatus.OK).send(campaigns);
});

const getActiveOffers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['type', 'offerStyle', 'tags', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const offers = await campaignService.getActiveOffers({ filter, options });
  res.status(httpStatus.OK).send(offers);
});

const getCampaignBySlugOrId = catchAsync(async (req, res) => {
  const { identifier } = req.params;

  if (!identifier) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Campaign ID or Slug');
  }

  const isObjectId =
    mongoose.Types.ObjectId.isValid(identifier) && new mongoose.Types.ObjectId(identifier).toString() === identifier;

  const query = isObjectId ? { _id: identifier } : { slug: identifier };

  const campaign = await campaignService.getCampaignByQuery(query, { publicOnly: true });
  res.status(httpStatus.OK).send(campaign);
});

const getOfferBySlugOrId = catchAsync(async (req, res) => {
  const { identifier } = req.params;

  if (!identifier) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Offer ID or Slug');
  }

  const isObjectId =
    mongoose.Types.ObjectId.isValid(identifier) && new mongoose.Types.ObjectId(identifier).toString() === identifier;

  const query = isObjectId ? { _id: identifier } : { slug: identifier };

  const offer = await campaignService.getOfferByQuery(query, { publicOnly: true });
  res.status(httpStatus.OK).send(offer);
});

const getCampaignsByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const filter = pick(req.query, ['tags', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  filter.type = type;

  const campaigns = await campaignService.getActiveCampaigns({ filter, options });
  res.status(httpStatus.OK).send(campaigns);
});

const getOffersByType = catchAsync(async (req, res) => {
  const { type } = req.params;
  const filter = pick(req.query, ['offerStyle', 'tags', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  filter.type = type;

  const offers = await campaignService.getActiveOffers({ filter, options });
  res.status(httpStatus.OK).send(offers);
});

const getFeaturedCampaignsAndOffers = catchAsync(async (req, res) => {
  const options = pick(req.query, ['limit']);

  const result = await campaignService.getFeaturedCampaignsAndOffers(options);
  res.status(httpStatus.OK).send(result);
});

const getHomepageOffers = catchAsync(async (req, res) => {
  const options = pick(req.query, ['limit']);

  const offers = await campaignService.getHomepageOffers(options);
  res.status(httpStatus.OK).send(offers);
});

// =============================================================================
// ADMIN CONTROLLERS - CAMPAIGNS
// =============================================================================

const getAllCampaignsForAdmin = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const filter = pick(req.query, [
    'title',
    'type',
    'status',
    'isActive',
    'isFeatured',
    'startDate',
    'endDate',
    'createdBy',
    'tags',
    'search',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  const campaigns = await campaignService.getAllCampaignsForAdmin({ filter, options });
  res.status(httpStatus.OK).send(campaigns);
});

const getCampaignForAdmin = catchAsync(async (req, res) => {
  const { campaignId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Campaign ID');
  }

  const campaign = await campaignService.getCampaignById(campaignId);
  res.status(httpStatus.OK).send(campaign);
});

const createCampaign = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const campaignData = {
    ...req.body,
    createdBy: req.user.id,
  };

  const campaign = await campaignService.createCampaign(campaignData);
  res.status(httpStatus.CREATED).send(campaign);
});

const updateCampaign = catchAsync(async (req, res) => {
  const { campaignId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Campaign ID');
  }

  const campaign = await campaignService.updateCampaign(campaignId, req.body);
  res.status(httpStatus.OK).send(campaign);
});

const deleteCampaign = catchAsync(async (req, res) => {
  const { campaignId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Campaign ID');
  }

  await campaignService.deleteCampaign(campaignId);
  res.status(httpStatus.NO_CONTENT).send();
});

const activateCampaign = catchAsync(async (req, res) => {
  const { campaignId } = req.params;

  const campaign = await campaignService.updateCampaignStatus(campaignId, 'active');
  res.status(httpStatus.OK).send(campaign);
});

const deactivateCampaign = catchAsync(async (req, res) => {
  const { campaignId } = req.params;

  const campaign = await campaignService.updateCampaignStatus(campaignId, 'paused');
  res.status(httpStatus.OK).send(campaign);
});

const getCampaignAnalytics = catchAsync(async (req, res) => {
  const { campaignId } = req.params;

  const analytics = await campaignService.getCampaignAnalytics(campaignId);
  res.status(httpStatus.OK).send(analytics);
});

// =============================================================================
// ADMIN CONTROLLERS - OFFERS
// =============================================================================

const getAllOffersForAdmin = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const filter = pick(req.query, [
    'title',
    'type',
    'status',
    'isActive',
    'isFeatured',
    'offerStyle',
    'startDate',
    'endDate',
    'createdBy',
    'tags',
    'search',
    'showOnHomepage',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  const offers = await campaignService.getAllOffersForAdmin({ filter, options });
  res.status(httpStatus.OK).send(offers);
});

const getOfferForAdmin = catchAsync(async (req, res) => {
  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Offer ID');
  }

  const offer = await campaignService.getOfferById(offerId);
  res.status(httpStatus.OK).send(offer);
});

const createOffer = catchAsync(async (req, res) => {
  if (!req.user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated');
  }

  const offerData = {
    ...req.body,
    createdBy: req.user.id,
  };

  const offer = await campaignService.createOffer(offerData);
  res.status(httpStatus.CREATED).send(offer);
});

const updateOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Offer ID');
  }

  const offer = await campaignService.updateOffer(offerId, req.body);
  res.status(httpStatus.OK).send(offer);
});

const deleteOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(offerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid Offer ID');
  }

  await campaignService.deleteOffer(offerId);
  res.status(httpStatus.NO_CONTENT).send();
});

const activateOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;

  const offer = await campaignService.updateOfferStatus(offerId, 'active');
  res.status(httpStatus.OK).send(offer);
});

const deactivateOffer = catchAsync(async (req, res) => {
  const { offerId } = req.params;

  const offer = await campaignService.updateOfferStatus(offerId, 'inactive');
  res.status(httpStatus.OK).send(offer);
});

const getOfferAnalytics = catchAsync(async (req, res) => {
  const { offerId } = req.params;

  const analytics = await campaignService.getOfferAnalytics(offerId);
  res.status(httpStatus.OK).send(analytics);
});

// =============================================================================
// UTILITY CONTROLLERS
// =============================================================================

const bulkActivateCampaigns = catchAsync(async (req, res) => {
  const { campaignIds } = req.body;

  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid campaign IDs array');
  }

  const result = await campaignService.bulkUpdateCampaigns(campaignIds, { status: 'active' });
  res.status(httpStatus.OK).send(result);
});

const bulkDeactivateCampaigns = catchAsync(async (req, res) => {
  const { campaignIds } = req.body;

  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid campaign IDs array');
  }

  const result = await campaignService.bulkUpdateCampaigns(campaignIds, { status: 'paused' });
  res.status(httpStatus.OK).send(result);
});

const bulkActivateOffers = catchAsync(async (req, res) => {
  const { offerIds } = req.body;

  if (!Array.isArray(offerIds) || offerIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid offer IDs array');
  }

  const result = await campaignService.bulkUpdateOffers(offerIds, { status: 'active' });
  res.status(httpStatus.OK).send(result);
});

const bulkDeactivateOffers = catchAsync(async (req, res) => {
  const { offerIds } = req.body;

  if (!Array.isArray(offerIds) || offerIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid offer IDs array');
  }

  const result = await campaignService.bulkUpdateOffers(offerIds, { status: 'inactive' });
  res.status(httpStatus.OK).send(result);
});

const getStatistics = catchAsync(async (req, res) => {
  const stats = await campaignService.getStatistics();
  res.status(httpStatus.OK).send(stats);
});

const validateItems = catchAsync(async (req, res) => {
  const { items, type } = req.body;

  const validation = await campaignService.validateItems(items, type);
  res.status(httpStatus.OK).send(validation);
});

module.exports = {
  // Public controllers
  getActiveCampaigns,
  getActiveOffers,
  getCampaignBySlugOrId,
  getOfferBySlugOrId,
  getCampaignsByType,
  getOffersByType,
  getFeaturedCampaignsAndOffers,
  getHomepageOffers,

  // Admin campaign controllers
  getAllCampaignsForAdmin,
  getCampaignForAdmin,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  activateCampaign,
  deactivateCampaign,
  getCampaignAnalytics,

  // Admin offer controllers
  getAllOffersForAdmin,
  getOfferForAdmin,
  createOffer,
  updateOffer,
  deleteOffer,
  activateOffer,
  deactivateOffer,
  getOfferAnalytics,

  // Utility controllers
  bulkActivateCampaigns,
  bulkDeactivateCampaigns,
  bulkActivateOffers,
  bulkDeactivateOffers,
  getStatistics,
  validateItems,
};

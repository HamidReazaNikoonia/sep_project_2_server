const express = require('express');
const campaignController = require('./campain.controller');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const campaignValidation = require('./campain.validation');

const router = express.Router();

// =============================================================================
// PUBLIC ROUTES - for frontend display
// =============================================================================

// Get all active campaigns (for public display)
router.get('/public/campaigns', campaignController.getActiveCampaigns);

// Get all active offers (for public display)
router.get('/public/offers', campaignController.getActiveOffers);

// Get campaign by slug or ID (public)
router.get('/public/campaigns/:identifier', campaignController.getCampaignBySlugOrId);

// Get offer by slug or ID (public)
router.get('/public/offers/:identifier', campaignController.getOfferBySlugOrId);

// Get campaigns by type (public)
router.get('/public/campaigns/type/:type', campaignController.getCampaignsByType);

// Get offers by type (public)
router.get('/public/offers/type/:type', campaignController.getOffersByType);

// Get featured campaigns and offers
router.get('/public/featured', campaignController.getFeaturedCampaignsAndOffers);

// Get homepage offers
router.get('/public/homepage-offers', campaignController.getHomepageOffers);

// =============================================================================
// ADMIN ROUTES - for campaign and offer management
// =============================================================================

// Campaign Admin Routes
router
  .route('/admin/campaigns')
  .get(auth('manageCampaigns'), campaignController.getAllCampaignsForAdmin)
  .post(auth('manageCampaigns'), validate(campaignValidation.createCampaign), campaignController.createCampaign);

router
  .route('/admin/campaigns/:campaignId')
  .get(auth('manageCampaigns'), campaignController.getCampaignForAdmin)
  .put(auth('manageCampaigns'), validate(campaignValidation.updateCampaign), campaignController.updateCampaign)
  .delete(auth('manageCampaigns'), campaignController.deleteCampaign);

// Campaign status management
router.patch('/admin/campaigns/:campaignId/activate', auth('manageCampaigns'), campaignController.activateCampaign);

router.patch('/admin/campaigns/:campaignId/deactivate', auth('manageCampaigns'), campaignController.deactivateCampaign);

// Campaign analytics
router.get('/admin/campaigns/:campaignId/analytics', auth('manageCampaigns'), campaignController.getCampaignAnalytics);

// =============================================================================

// Offer Admin Routes
router
  .route('/admin/offers')
  .get(auth('manageCampaigns'), campaignController.getAllOffersForAdmin)
  .post(auth('manageCampaigns'), validate(campaignValidation.createOffer), campaignController.createOffer);

router
  .route('/admin/offers/:offerId')
  .get(auth('manageCampaigns'), campaignController.getOfferForAdmin)
  .put(auth('manageCampaigns'), validate(campaignValidation.updateOffer), campaignController.updateOffer)
  .delete(auth('manageCampaigns'), campaignController.deleteOffer);

// Offer status management
router.patch('/admin/offers/:offerId/activate', auth('manageCampaigns'), campaignController.activateOffer);

router.patch('/admin/offers/:offerId/deactivate', auth('manageCampaigns'), campaignController.deactivateOffer);

// Offer analytics
router.get('/admin/offers/:offerId/analytics', auth('manageCampaigns'), campaignController.getOfferAnalytics);

// =============================================================================
// UTILITY ROUTES
// =============================================================================

// Bulk operations
router.post('/admin/campaigns/bulk-activate', auth('manageCampaigns'), campaignController.bulkActivateCampaigns);

router.post('/admin/campaigns/bulk-deactivate', auth('manageCampaigns'), campaignController.bulkDeactivateCampaigns);

router.post('/admin/offers/bulk-activate', auth('manageCampaigns'), campaignController.bulkActivateOffers);

router.post('/admin/offers/bulk-deactivate', auth('manageCampaigns'), campaignController.bulkDeactivateOffers);

// Get campaign/offer statistics
router.get('/admin/statistics', auth('manageCampaigns'), campaignController.getStatistics);

// Validate campaign/offer items
router.post(
  '/admin/validate-items',
  auth('manageCampaigns'),
  validate(campaignValidation.validateItems),
  campaignController.validateItems
);

module.exports = router;

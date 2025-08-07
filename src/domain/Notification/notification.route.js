const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const notificationValidation = require('./notification.validation');
const notificationController = require('./notification.controller');

const router = express.Router();

// Public routes (for webhooks, etc.)
router.route('/webhook/:type').post(notificationController.handleWebhook);

// Protected routes
router.use(auth());

// Get notifications with filters and pagination
router
  .route('/')
  .get(validate(notificationValidation.getNotifications), notificationController.getNotifications)
  .post(validate(notificationValidation.createNotification), notificationController.createNotification);

// Bulk operations
router.route('/bulk/mark-read').patch(notificationController.markAllAsRead);

router.route('/unread-count').get(notificationController.getUnreadCount);

// Individual notification operations
router
  .route('/:notificationId')
  .get(validate(notificationValidation.getNotification), notificationController.getNotification)
  .patch(validate(notificationValidation.updateNotification), notificationController.updateNotification)
  .delete(validate(notificationValidation.deleteNotification), notificationController.deleteNotification);

router
  .route('/:notificationId/mark-read')
  .patch(validate(notificationValidation.markAsRead), notificationController.markAsRead);

router
  .route('/:notificationId/mark-clicked')
  .patch(validate(notificationValidation.markAsClicked), notificationController.markAsClicked);

// Admin routes
router
  .route('/admin/all')
  .get(auth('admin'), validate(notificationValidation.getAllNotifications), notificationController.getAllNotifications);

router.route('/admin/analytics').get(auth('admin'), notificationController.getAnalytics);

module.exports = router;

const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const notificationService = require('./notification.service');

const createNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.createNotification(req.body);
  res.status(httpStatus.CREATED).send(notification);
});

const getNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'customer',
    'notification_type',
    'status',
    'read_status',
    'priority',
    'deleted',
    'is_expired',
    'sender_type',
    'sender_user_id',
    'campaign_id',
    'created_from',
    'created_to',
  ]);

  // If not admin, filter by current user
  if (!req.user.role || req.user.role !== 'admin') {
    filter.customer = req.user.id;
  }

  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await notificationService.queryNotifications(filter, options);
  res.send(result);
});

const getAllNotifications = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'customer',
    'notification_type',
    'status',
    'read_status',
    'priority',
    'deleted',
    'sender_type',
    'campaign_id',
    'created_from',
    'created_to',
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await notificationService.queryNotifications(filter, options);
  res.send(result);
});

const getNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.getNotificationById(req.params.notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  // Check if user can access this notification
  if (req.user.role !== 'admin' && notification.customer.toString() !== req.user.id) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  res.send(notification);
});

const updateNotification = catchAsync(async (req, res) => {
  const notification = await notificationService.updateNotificationById(req.params.notificationId, req.body);
  res.send(notification);
});

const deleteNotification = catchAsync(async (req, res) => {
  await notificationService.deleteNotificationById(req.params.notificationId);
  res.status(httpStatus.NO_CONTENT).send();
});

const markAsRead = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.notificationId, req.user.id);
  res.send(notification);
});

const markAsClicked = catchAsync(async (req, res) => {
  const notification = await notificationService.markAsClicked(req.params.notificationId, req.user.id);
  res.send(notification);
});

const markAllAsRead = catchAsync(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  res.send(result);
});

const getUnreadCount = catchAsync(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.send({ unreadCount: count });
});

const getAnalytics = catchAsync(async (req, res) => {
  const analytics = await notificationService.getAnalytics();
  res.send(analytics);
});

const handleWebhook = catchAsync(async (req, res) => {
  const { type } = req.params;
  await notificationService.handleDeliveryWebhook(type, req.body);
  res.status(httpStatus.OK).send({ success: true });
});

module.exports = {
  createNotification,
  getNotifications,
  getAllNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  markAsRead,
  markAsClicked,
  markAllAsRead,
  getUnreadCount,
  getAnalytics,
  handleWebhook,
};

const Joi = require('joi');
const { objectId } = require('../../validations/custom.validation');

const createNotification = {
  body: Joi.object().keys({
    customer: Joi.string().custom(objectId).required(),
    notification_type: Joi.string()
      .valid(
        'success_create_reference',
        'payment_fail_create_reference',
        'from_admin',
        'course_enrollment',
        'course_completion',
        'session_reminder',
        'session_cancelled',
        'payment_success',
        'payment_failed',
        'coupon_expiry',
        'account_verification',
        'password_reset',
        'profile_update',
        'system_maintenance',
        'promotional',
        'announcement'
      )
      .required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    title: Joi.string().required().max(100),
    message: Joi.string().required().max(500),
    content: Joi.object().keys({
      html_body: Joi.string(),
      short_text: Joi.string(),
      action_url: Joi.string().uri(),
      image_url: Joi.string().uri(),
      data: Joi.object(),
    }),
    channels: Joi.array().items(Joi.string().valid('sms', 'email', 'push', 'in_app', 'webhook')).default(['in_app']),
    scheduled_for: Joi.date(),
    expires_at: Joi.date(),
    state: Joi.object(),
    template_id: Joi.string(),
    template_variables: Joi.object(),
    language: Joi.string().valid('fa', 'en').default('fa'),
    actions: Joi.array().items(
      Joi.object().keys({
        id: Joi.string(),
        label: Joi.string(),
        url: Joi.string().uri(),
        style: Joi.string().valid('primary', 'secondary', 'danger', 'success').default('primary'),
      })
    ),
  }),
};

const getNotifications = {
  query: Joi.object().keys({
    customer: Joi.string().custom(objectId),
    notification_type: Joi.string(),
    status: Joi.string().valid('draft', 'scheduled', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'expired'),
    read_status: Joi.boolean(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    deleted: Joi.boolean(),
    is_expired: Joi.boolean(),
    sender_type: Joi.string().valid('system', 'admin', 'coach', 'automated'),
    sender_user_id: Joi.string().custom(objectId),
    campaign_id: Joi.string(),
    created_from: Joi.date(),
    created_to: Joi.date(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getAllNotifications = {
  query: Joi.object().keys({
    customer: Joi.string().custom(objectId),
    notification_type: Joi.string(),
    status: Joi.string(),
    read_status: Joi.boolean(),
    priority: Joi.string(),
    deleted: Joi.boolean(),
    sender_type: Joi.string(),
    campaign_id: Joi.string(),
    created_from: Joi.date(),
    created_to: Joi.date(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getNotification = {
  params: Joi.object().keys({
    notificationId: Joi.string().custom(objectId),
  }),
};

const updateNotification = {
  params: Joi.object().keys({
    notificationId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string().max(100),
      message: Joi.string().max(500),
      content: Joi.object(),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
      scheduled_for: Joi.date(),
      expires_at: Joi.date(),
      status: Joi.string().valid('draft', 'scheduled', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'expired'),
    })
    .min(1),
};

const deleteNotification = {
  params: Joi.object().keys({
    notificationId: Joi.string().custom(objectId),
  }),
};

const markAsRead = {
  params: Joi.object().keys({
    notificationId: Joi.string().custom(objectId),
  }),
};

const markAsClicked = {
  params: Joi.object().keys({
    notificationId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createNotification,
  getNotifications,
  getAllNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  markAsRead,
  markAsClicked,
};

/* eslint-disable no-param-reassign */
/* eslint-disable default-case */
/* eslint-disable no-restricted-syntax */
const { ObjectID } = require('mongoose');
const httpStatus = require('http-status');
const { v4: uuidv4 } = require('uuid');
const Notification = require('./notification.model');
const User = require('../../models/user.model');
const ApiError = require('../../utils/ApiError');
const { Send: sendSMS } = require('../../services/sms/smsProvider');

const config = require('../../config/config');

const orderStatusUpdateNotificationTypes = {
  waiting: 'در انتظار تایید',
  confirmed: 'تایید شد',
  shipped: 'ارسال شد',
  delivered: 'تحویل داده شد',
  cancelled: 'لغو شد',
  returned: 'بازگشت شد',
  finish: 'تکمیل شد',
};

/**
 * Create a notification
 * @param {Object} notificationBody
 * @returns {Promise<Notification>}
 */
const createNotification = async (notificationBody) => {
  const notification = await Notification.create(notificationBody);

  // Send SMS to user
  if (notification.channels.includes('sms')) {
    const link =
      notification?.content?.action_url ||
      (notification?.actions && notification.actions.length > 0 && notification.actions[0].url) ||
      '';

    const smsMessageTemplate = `${notification.title || ''}
      \n- ${notification.message || ''}
    ${link ? `\n- لینک: ${link}` : ''}`;

    console.log('smsMessageTemplate', smsMessageTemplate);

    await sendSMS(notification.customer.mobile, smsMessageTemplate);
  }

  // Trigger delivery process
  // eslint-disable-next-line no-use-before-define
  await processNotificationDelivery(notification);

  return notification;
};

/**
 * Query for notifications
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryNotifications = async (filter, options) => {
  // Handle special filters
  const mongoFilter = { ...filter };

  // Handle search filter for customer information
  if (filter.search) {
    const searchTerm = filter.search.trim();
    if (searchTerm) {
      // Create search query for user fields
      const userSearchQuery = {
        $or: [
          { first_name: { $regex: searchTerm, $options: 'i' } },
          { last_name: { $regex: searchTerm, $options: 'i' } },
          { mobile: { $regex: searchTerm, $options: 'i' } },
          { student_id: { $regex: searchTerm, $options: 'i' } },
          { nationalId: { $regex: searchTerm, $options: 'i' } },
        ],
      };

      // Find matching users
      const matchingUsers = await User.find(userSearchQuery, '_id');
      const userIds = matchingUsers.map((user) => user._id);

      // Filter notifications by matching customer IDs
      if (userIds.length > 0) {
        mongoFilter.customer = { $in: userIds };
      } else {
        // If no users match the search, return empty result
        mongoFilter.customer = { $in: [] };
      }
    }
    delete mongoFilter.search;
  }

  // Handle is_expired filter
  if (filter.is_expired !== undefined) {
    if (filter.is_expired === true || filter.is_expired === 'true') {
      mongoFilter.expires_at = { $lt: new Date() };
    } else {
      mongoFilter.$or = [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }];
    }
    delete mongoFilter.is_expired;
  }

  // Handle sender filters
  if (filter.sender_type) {
    mongoFilter['sender.type'] = filter.sender_type;
    delete mongoFilter.sender_type;
  }

  if (filter.sender_user_id) {
    mongoFilter['sender.user_id'] = filter.sender_user_id;
    delete mongoFilter.sender_user_id;
  }

  // Handle date range filters
  if (filter.created_from_date || filter.created_to_date) {
    mongoFilter.createdAt = {};
    if (filter.created_from_date) {
      mongoFilter.createdAt.$gte = new Date(filter.created_from_date);
      delete mongoFilter.created_from_date;
    }
    if (filter.created_to_date) {
      mongoFilter.createdAt.$lte = new Date(filter.created_to_date);
      delete mongoFilter.created_to_date;
    }
  }

  const notifications = await Notification.paginate(mongoFilter, {
    ...options,
    populate: 'customer sender.user_id',
    sortBy: options.sortBy || 'createdAt:desc',
  });

  return notifications;
};

/**
 * Get notification by id
 * @param {ObjectId} id
 * @returns {Promise<Notification>}
 */
const getNotificationById = async (id) => {
  return Notification.findById(id).populate('customer sender.user_id');
};

/**
 * Update notification by id
 * @param {ObjectId} notificationId
 * @param {Object} updateBody
 * @returns {Promise<Notification>}
 */
const updateNotificationById = async (notificationId, updateBody) => {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }
  Object.assign(notification, updateBody);
  await notification.save();
  return notification;
};

/**
 * Delete notification by id
 * @param {ObjectId} notificationId
 * @returns {Promise<Notification>}
 */
const deleteNotificationById = async (notificationId) => {
  const notification = await getNotificationById(notificationId);
  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  // Soft delete
  notification.deleted = true;
  notification.deleted_at = new Date();
  await notification.save();

  return notification;
};

/**
 * Mark notification as read
 * @param {ObjectId} notificationId
 * @param {ObjectId} userId
 * @returns {Promise<Notification>}
 */
const markAsRead = async (notificationId, userId) => {
  return Notification.markAsRead(notificationId, userId);
};

/**
 * Mark notification as clicked
 * @param {ObjectId} notificationId
 * @param {ObjectId} userId
 * @returns {Promise<Notification>}
 */
const markAsClicked = async (notificationId, userId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    customer: userId,
  });

  if (!notification) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Notification not found');
  }

  return notification.markAsClicked();
};

/**
 * Mark all notifications as read for user
 * @param {ObjectId} userId
 * @returns {Promise<Object>}
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.markAllAsRead(userId);
  return { modifiedCount: result?.nModified };
};

/**
 * Get unread count for user
 * @param {ObjectId} userId
 * @returns {Promise<number>}
 */
const getUnreadCount = async (userId) => {
  return Notification.getUnreadCount(userId);
};

/**
 * Get analytics data
 * @returns {Promise<Object>}
 */
const getAnalytics = async () => {
  const totalNotifications = await Notification.countDocuments({ deleted: false });
  const unreadNotifications = await Notification.countDocuments({
    deleted: false,
    read_status: false,
  });

  const deliveryStats = await Notification.aggregate([
    { $match: { deleted: false } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const typeStats = await Notification.aggregate([
    { $match: { deleted: false } },
    {
      $group: {
        _id: '$notification_type',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    total: totalNotifications,
    unread: unreadNotifications,
    deliveryStats,
    typeStats,
  };
};

/**
 * Process notification delivery
 * @param {Notification} notification
 */
const processNotificationDelivery = async (notification) => {
  // This would integrate with your actual delivery services
  // For now, we'll just update the status

  try {
    for (const channel of notification.channels) {
      switch (channel) {
        case 'in_app':
          notification.delivery_status.in_app.status = 'delivered';
          notification.delivery_status.in_app.delivered_at = new Date();
          break;
        case 'sms':
          // Integration with SMS service
          notification.delivery_status.sms.status = 'pending';
          break;
        case 'email':
          // Integration with Email service
          notification.delivery_status.email.status = 'pending';
          break;
        case 'push':
          // Integration with Push notification service
          notification.delivery_status.push.status = 'pending';
          break;
      }
    }

    notification.status = 'delivered';
    await notification.save();
  } catch (error) {
    notification.status = 'failed';
    await notification.save();
    throw error;
  }
};

/**
 * Handle delivery webhooks
 * @param {string} type
 * @param {Object} data
 */
const handleDeliveryWebhook = async (type, data) => {
  // Handle webhooks from delivery services (SMS, Email, Push providers)
  // Implementation depends on your providers
};

// ============= USER ACTION NOTIFICATION SERVICES =============

/**
 * Send login notification
 * @param {ObjectId} userId
 * @param {boolean} isFirstTime
 * @param {Object} metadata
 */
const sendLoginNotification = async (userId, isFirstTime = false, metadata = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: isFirstTime ? 'account_verification' : 'from_admin',
    priority: 'low',
    title: isFirstTime ? 'خوش آمدید!' : 'ورود موفق',
    message: isFirstTime
      ? 'به پلتفرم آموزشی ما خوش آمدید. پروفایل خود را تکمیل کنید.'
      : 'شما با موفقیت وارد حساب کاربری خود شدید.',
    channels: ['in_app'],
    metadata: {
      source: 'auth_service',
      ...metadata,
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send profile update notification
 * @param {ObjectId} userId
 * @param {string} updateType
 */
const sendProfileUpdateNotification = async (userId, updateType = 'general') => {
  const notificationData = {
    customer: userId,
    notification_type: 'profile_update',
    priority: 'low',
    title: 'بروزرسانی پروفایل',
    message: 'اطلاعات پروفایل شما با موفقیت بروزرسانی شد.',
    channels: ['in_app'],
    metadata: {
      source: 'profile_service',
      update_type: updateType,
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send profile verification notification
 * @param {ObjectId} userId
 * @param {boolean} isApproved
 */
const sendProfileVerificationNotification = async (userId, isApproved = true) => {
  const notificationData = {
    customer: userId,
    notification_type: 'account_verification',
    priority: 'high',
    title: isApproved ? 'تایید حساب کاربری' : 'رد تایید حساب کاربری',
    message: isApproved
      ? 'حساب کاربری شما توسط ادمین تایید شد.'
      : 'حساب کاربری شما توسط ادمین رد شد. لطفاً اطلاعات خود را بررسی کنید.',
    channels: ['in_app', 'sms', 'email'],
    metadata: {
      source: 'admin_service',
      verification_status: isApproved,
    },
    sender: {
      type: 'admin',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send order creation notification
 * @param {ObjectId} userId
 * @param {ObjectId} orderId
 * @param {Object} orderDetails
 */
const sendOrderCreationNotification = async (userId, orderId, orderDetails = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: 'success_create_reference',
    priority: 'medium',
    title: 'ایجاد سفارش',
    message: `سفارش شما با شناسه ${orderDetails.reference || orderId} ایجاد شد.`,
    channels: ['in_app', 'sms'],
    state: {
      order_id: orderId,
      reference_id: orderDetails.reference,
    },
    content: {
      action_url: `/orders/${orderId}`,
    },
    actions: [
      {
        id: 'view_order',
        label: 'مشاهده سفارش',
        url: `/orders/${orderId}`,
        style: 'primary',
      },
    ],
    metadata: {
      source: 'order_service',
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send order status update notification
 * @param {ObjectId} userId
 * @param {ObjectId} orderId
 * @param {string} status
 */
const sendOrderStatusUpdateNotification = async (userId, orderId, status, orderData) => {
  const notificationData = {
    customer: userId,
    notification_type: 'order_status_update',
    priority: 'urgent',
    title: 'بروزرسانی سفارش',
    message: `سفارش شما با شناسه ${orderData.reference || orderId} به وضعیت "${
      orderStatusUpdateNotificationTypes[status]
    }" بروزرسانی شد.`,
    channels: ['in_app', 'sms'],
    state: {
      order_id: orderId,
      status,
    },
    content: {
      action_url: `/orders/${orderId}`,
    },
    actions: [
      {
        id: 'view_order',
        label: 'مشاهده سفارش',
        url: `/orders/${orderId}`,
        style: 'primary',
      },
    ],
    metadata: {
      source: 'order_service',
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send payment notification
 * @param {ObjectId} userId
 * @param {ObjectId} orderId
 * @param {boolean} isSuccess
 * @param {Object} paymentDetails
 */
const sendPaymentNotification = async (userId, orderId, isSuccess = true, paymentDetails = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: isSuccess ? 'payment_success' : 'payment_failed',
    priority: 'high',
    title: isSuccess ? 'پرداخت موفق' : 'پرداخت ناموفق',
    message: isSuccess
      ? `پرداخت شما با موفقیت انجام شد. مبلغ: ${paymentDetails.amount || 'نامشخص'} تومان`
      : 'پرداخت شما ناموفق بود. لطفاً مجدداً تلاش کنید.',
    channels: ['in_app', 'sms', 'email'],
    state: {
      order_id: orderId,
      transaction_id: paymentDetails.transactionId,
      reference_id: paymentDetails.reference,
    },
    content: {
      action_url: isSuccess ? `/orders/${orderId}` : `/payment/retry/${orderId}`,
    },
    actions: isSuccess
      ? [
          {
            id: 'view_order',
            label: 'مشاهده سفارش',
            url: `/orders/${orderId}`,
            style: 'primary',
          },
        ]
      : [
          {
            id: 'retry_payment',
            label: 'تلاش مجدد',
            url: `/payment/retry/${orderId}`,
            style: 'primary',
          },
        ],
    metadata: {
      source: 'payment_service',
      ...paymentDetails,
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send program payment notification
 * @param {ObjectId} userId
 * @param {ObjectId} orderId
 * @param {boolean} isSuccess
 * @param {Object} paymentDetails
 */
const sendProgramPaymentNotification = async (userId, orderId, isSuccess = true, paymentDetails = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: isSuccess ? 'payment_success' : 'payment_failed',
    priority: 'high',
    title: isSuccess ? 'پرداخت موفق' : 'پرداخت ناموفق',
    message: isSuccess
      ? `پرداخت شما با موفقیت انجام شد. مبلغ: ${paymentDetails.amount || 'نامشخص'} تومان`
      : 'پرداخت شما ناموفق بود. لطفاً مجدداً تلاش کنید.',
    channels: ['in_app', 'sms', 'email'],
    state: {
      order_id: orderId,
      transaction_id: paymentDetails.transactionId,
      reference_id: paymentDetails.reference,
    },
    // content: {
    //   action_url: isSuccess ? `/orders/${orderId}` : `/payment/retry/${orderId}`,
    // },
    // actions: isSuccess
    //   ? [
    //       {
    //         id: 'view_order',
    //         label: 'مشاهده سفارش',
    //         url: `/orders/${orderId}`,
    //         style: 'primary',
    //       },
    //     ]
    //   : [
    //       {
    //         id: 'retry_payment',
    //         label: 'تلاش مجدد',
    //         url: `/payment/retry/${orderId}`,
    //         style: 'primary',
    //       },
    //     ],
    metadata: {
      source: 'payment_service',
      ...paymentDetails,
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send course enrollment notification
 * @param {ObjectId} userId
 * @param {ObjectId} programId
 * @param {Object} courseDetails
 */
const sendCourseEnrollmentNotification = async (userId, programId, courseDetails = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: 'course_enrollment',
    priority: 'high',
    title: 'ثبت نام در کلاس',
    message: `شما با موفقیت در کلاس "${courseDetails.title || 'نامشخص'}" - مدرس: ${
      courseDetails.coachFullName || 'مدرس نامشخص'
    } ثبت نام شدید. لطفاً به صفحه کلاس مراجعه کنید.`,
    channels: ['in_app', 'sms', 'email'],
    state: {
      program_id: courseDetails.programId,
      order_id: courseDetails.orderId,
    },
    content: {
      action_url: `${config.CLIENT_URL}/dashboard/course-session?program_id=${courseDetails.orderId}`,
    },
    actions: [
      {
        id: 'view_course',
        label: 'مشاهده دوره',
        url: `${config.CLIENT_URL}/dashboard/course-session?program_id=${programId}`,
        style: 'primary',
      },
    ],
    metadata: {
      source: 'course_service',
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send session reminder notification
 * @param {ObjectId} userId
 * @param {ObjectId} sessionId
 * @param {Object} sessionDetails
 * @param {string} reminderType - '1day' or '1hour'
 */
const sendSessionReminderNotification = async (userId, sessionId, sessionDetails = {}, reminderType = '1hour') => {
  const timeText = reminderType === '1day' ? '24 ساعت' : '1 ساعت';

  const notificationData = {
    customer: userId,
    notification_type: 'session_reminder',
    priority: 'high',
    title: 'یادآوری جلسه',
    message: `جلسه "${sessionDetails.title || 'نامشخص'}" ${timeText} دیگر شروع می‌شود.`,
    channels: ['in_app', 'sms', 'push'],
    scheduled_for: sessionDetails.reminderTime || new Date(),
    state: {
      session_id: sessionId,
      startTime: sessionDetails.startTime,
      endTime: sessionDetails.endTime,
    },
    content: {
      action_url: `/sessions/${sessionId}`,
    },
    actions: [
      {
        id: 'join_session',
        label: 'ورود به جلسه',
        url: `/sessions/${sessionId}`,
        style: 'primary',
      },
    ],
    metadata: {
      source: 'session_service',
      reminder_type: reminderType,
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send session completion notification
 * @param {ObjectId} userId
 * @param {ObjectId} sessionId
 * @param {Object} sessionDetails
 */
const sendSessionCompletionNotification = async (userId, sessionId, sessionDetails = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: 'course_completion',
    priority: 'medium',
    title: 'اتمام جلسه',
    message: `جلسه "${sessionDetails.title || 'نامشخص'}" با موفقیت به پایان رسید.`,
    channels: ['in_app'],
    state: {
      session_id: sessionId,
    },
    content: {
      action_url: `/sessions/${sessionId}/summary`,
    },
    actions: [
      {
        id: 'view_summary',
        label: 'مشاهده خلاصه',
        url: `/sessions/${sessionId}/summary`,
        style: 'primary',
      },
    ],
    metadata: {
      source: 'session_service',
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send session cancellation notification
 * @param {ObjectId} userId
 * @param {ObjectId} sessionId
 * @param {Object} sessionDetails
 * @param {string} reason
 */
const sendSessionCancellationNotification = async (userId, sessionId, sessionDetails = {}, reason = '') => {
  const notificationData = {
    customer: userId,
    notification_type: 'session_cancelled',
    priority: 'high',
    title: 'لغو جلسه',
    message: `جلسه "${sessionDetails.title || 'نامشخص'}" لغو شد.${reason ? ` دلیل: ${reason}` : ''}`,
    channels: ['in_app', 'sms', 'email'],
    state: {
      session_id: sessionId,
      cancellation_reason: reason,
    },
    metadata: {
      source: 'admin_service',
      cancellation_reason: reason,
    },
    sender: {
      type: 'admin',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send new session announcement notification
 * @param {ObjectId} userId
 * @param {ObjectId} sessionId
 * @param {Object} sessionDetails
 */
const sendNewSessionAnnouncementNotification = async (userId, sessionId, sessionDetails = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: 'announcement',
    priority: 'medium',
    title: 'جلسه جدید',
    message: `جلسه جدید "${sessionDetails.title || 'نامشخص'}" اضافه شد.`,
    channels: ['in_app', 'push'],
    state: {
      session_id: sessionId,
    },
    content: {
      action_url: `/sessions/${sessionId}`,
    },
    actions: [
      {
        id: 'view_session',
        label: 'مشاهده جلسه',
        url: `/sessions/${sessionId}`,
        style: 'primary',
      },
    ],
    metadata: {
      source: 'admin_service',
    },
    sender: {
      type: 'admin',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send ticket reply notification
 * @param {ObjectId} userId
 * @param {ObjectId} ticketId
 * @param {Object} ticketDetails
 */
const sendTicketReplyNotification = async (userId, ticketId, ticketDetails = {}) => {
  const notificationData = {
    customer: userId,
    notification_type: 'from_admin',
    priority: 'medium',
    title: 'پاسخ تیکت',
    message: `ادمین به تیکت شما پاسخ داده است. موضوع: ${ticketDetails.subject || 'نامشخص'}`,
    channels: ['in_app', 'email'],
    state: {
      reference_id: ticketId,
    },
    content: {
      action_url: `/tickets/${ticketId}`,
    },
    actions: [
      {
        id: 'view_ticket',
        label: 'مشاهده تیکت',
        url: `/tickets/${ticketId}`,
        style: 'primary',
      },
    ],
    metadata: {
      source: 'ticket_service',
    },
    sender: {
      type: 'admin',
    },
  };

  return createNotification(notificationData);
};

/**
 * Send referral reward notification
 * @param {ObjectId} userId
 * @param {ObjectId} referralId
 * @param {Object} referralDetails
 */
const sendReferralRewardNotification = async (userId, referralId, referralDetails = {}) => {

  const notificationData = {
    customer: userId,
    notification_type: 'referral_reward',
    priority: 'urgent',
    title: 'شارژ حساب کاربری',
    message: `شارژ حساب کاربری شما با موفقیت انجام شد. مبلغ: ${referralDetails?.reward_amount || 'نامشخص'} تومان`,
    channels: ['in_app', 'sms'],
    state: {
      referral_id: referralId,
    },
    sender: {
      type: 'system',
    },
  };

  return createNotification(notificationData);
};

module.exports = {
  createNotification,
  queryNotifications,
  getNotificationById,
  updateNotificationById,
  deleteNotificationById,
  markAsRead,
  markAsClicked,
  markAllAsRead,
  getUnreadCount,
  getAnalytics,
  handleDeliveryWebhook,

  // User action notifications
  sendLoginNotification,
  sendProfileUpdateNotification,
  sendProfileVerificationNotification,
  sendOrderCreationNotification,
  sendOrderStatusUpdateNotification,
  sendPaymentNotification,
  sendProgramPaymentNotification,
  sendCourseEnrollmentNotification,
  sendSessionReminderNotification,
  sendSessionCompletionNotification,
  sendSessionCancellationNotification,
  sendNewSessionAnnouncementNotification,
  sendTicketReplyNotification,

  // Referral code notifications
  sendReferralRewardNotification,
};

// seeders/seedNotifications.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import your Notification model
const Notification = require('../domain/Notification/notification.model');

// Your provided IDs
const USER_IDS = ['68526d430cec9186a98c07bb'];

const COURSE_IDS = ['6843b58fd8e1902c7d162e75', '6843b676d8e1902c7d162e8c', '6843cabec8b36b2417f13236'];

// Helper: Random item from array
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Helper: Random date within next 7 days (for scheduling)
const randomFutureDate = () => {
  const days = Math.floor(Math.random() * 7);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Helper: Random past date within last 3 days
const randomPastDate = () => {
  const days = Math.floor(Math.random() * 3);
  const date = new Date();
  date.setHours(date.getHours() - days * 24);
  return date;
};

// Seed Data Generator
const generateSeedData = () => {
  const notifications = [];

  const types = [
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
    'announcement',
  ];

  const priorities = ['low', 'medium', 'high', 'urgent'];
  const channels = ['sms', 'email', 'push', 'in_app', 'webhook'];
  const senders = ['system', 'admin', 'coach', 'automated'];

  for (let i = 0; i < 15; i++) {
    const type = randomItem(types);
    const customer = new mongoose.Types.ObjectId(randomItem(USER_IDS));
    const courseId = randomItem(COURSE_IDS);
    const senderType = randomItem(senders);
    const createdAt = randomPastDate();

    // Define title and message based on notification type
    const getTitleAndMessage = (type) => {
      switch (type) {
        case 'course_enrollment':
          return {
            title: 'ثبت‌نام در دوره با موفقیت انجام شد',
            message: `شما با موفقیت در دوره ثبت‌نام کردید.`,
            html_body: `<p>تبریک! شما در <strong>دوره آموزشی</strong> ثبت‌نام کردید.</p>`,
            action_url: `https://example.com/courses/${courseId}`,
            short_text: 'ثبت‌نام شما تأیید شد!',
          };
        case 'payment_success':
          return {
            title: 'پرداخت موفقیت‌آمیز بود',
            message: 'پرداخت شما با موفقیت انجام شد.',
            html_body: '<p>پرداخت شما با موفقیت تأیید شد. ممنون از خرید شما!</p>',
            action_url: 'https://example.com/orders/latest',
            short_text: 'پرداخت موفق: ممنون از شما!',
          };
        case 'session_reminder':
          return {
            title: 'یادآوری جلسه آموزشی',
            message: 'جلسه شما فردا ساعت 18:00 برگزار می‌شود.',
            html_body: '<p>فردا در جلسه <strong>زبان انگلیسی پیشرفته</strong> شرکت کنید.</p>',
            action_url: `https://example.com/sessions/upcoming`,
            short_text: 'جلسه فردا: 18:00',
          };
        case 'promotional':
          return {
            title: 'تخفیف ویژه هفته جشنواره!',
            message: 'تا 50% تخفیف روی تمام دوره‌ها — فقط امروز!',
            html_body: '<h3>🎉 فروش ویژه آموزشی!</h3><p>همین حالا ثبت‌نام کنید.</p>',
            image_url: 'https://example.com/images/promo-banner.jpg',
            action_url: 'https://example.com/offers',
            short_text: 'تخفیف 50%: همین حالا خرید کنید!',
          };
        case 'account_verification':
          return {
            title: 'تایید حساب کاربری',
            message: 'لطفاً ایمیل خود را برای تأیید حساب بررسی کنید.',
            action_url: `https://example.com/verify?token=abc123`,
            short_text: 'ایمیل تأیید ارسال شد.',
          };
        default:
          return {
            title: `اطلاعیه: ${type}`,
            message: `این یک اطلاعیه از نوع ${type} است.`,
            action_url: 'https://example.com/dashboard',
            short_text: 'اطلاعیه جدید دریافت کردید.',
          };
      }
    };

    const contentData = getTitleAndMessage(type);

    // Randomly select 1-3 channels
    const selectedChannels = [
      ...new Set(Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => randomItem(channels))),
    ];

    // Build delivery status per channel
    const deliveryStatus = {};
    ['sms', 'email', 'push', 'in_app'].forEach((ch) => {
      const statusOptions = {
        sms: ['pending', 'sent', 'delivered', 'failed', 'not_sent'],
        email: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'not_sent'],
        push: ['pending', 'sent', 'delivered', 'clicked', 'failed', 'not_sent'],
        in_app: ['pending', 'delivered', 'read', 'not_sent'],
      };

      const statuses = statusOptions[ch];
      const status = randomItem(statuses);
      const sentAt = status !== 'not_sent' && status !== 'pending' ? randomPastDate() : undefined;
      const deliveredAt = ['delivered', 'opened', 'clicked', 'read'].includes(status) ? randomPastDate() : undefined;
      const openedAt = status === 'opened' ? randomPastDate() : undefined;
      const clickedAt = ['clicked'].includes(status) ? randomPastDate() : undefined;
      const readAt = status === 'read' ? randomPastDate() : undefined;

      deliveryStatus[ch] = {
        status,
        sent_at: sentAt,
        delivered_at: deliveredAt,
        opened_at: openedAt,
        clicked_at: clickedAt,
        error_message: null,
        provider_response: null,
      };
      if (status === 'failed') deliveryStatus[ch].error_message = 'Delivery failed: Invalid phone number';
    });

    // Read status
    const isRead = Math.random() > 0.5;
    const readAt = isRead ? randomPastDate() : undefined;

    // Click tracking
    const clicked = isRead && Math.random() > 0.5;
    const clickedAt = clicked ? randomPastDate() : undefined;

    // Actions (CTA buttons)
    const actions = [
      {
        id: 'primary_action',
        label: contentData.label || 'مشاهده جزئیات',
        url: contentData.action_url || 'https://example.com',
        style: 'primary',
      },
    ];

    // Status logic
    let status = 'sent';
    if (deliveryStatus.in_app.status === 'delivered' && isRead) status = 'delivered';
    if (clicked) status = 'sent'; // or 'converted' if you extend logic
    if (deliveryStatus.email.status === 'failed' && !deliveryStatus.in_app.status === 'delivered') status = 'failed';

    const notification = {
      customer,
      notification_type: type,
      priority: randomItem(priorities),
      title: contentData.title,
      message: contentData.message,
      content: {
        html_body: contentData.html_body,
        short_text: contentData.short_text,
        action_url: contentData.action_url,
        image_url: contentData.image_url,
        data: { extra: 'custom_payload' },
      },
      channels: selectedChannels,
      delivery_status: deliveryStatus,
      read_status: isRead,
      read_at: readAt,
      clicked,
      clicked_at: clickedAt,
      scheduled_for: Math.random() > 0.8 ? randomFutureDate() : undefined,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      state: {
        course_id: courseId,
        reference_id: `REF-${Date.now()}-${i}`,
        order_id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        custom_data: { tag: `seed-${i}` },
      },
      template_id: `tmpl-${type}`,
      template_variables: { name: 'کاربر محترم', course: 'آموزش React' },
      language: Math.random() > 0.3 ? 'fa' : 'en',
      campaign_id: 'CAMPAIGN-NEWYEAR2025',
      batch_id: 'BATCH-001',
      group_key: `user-${customer}`,
      sender: {
        type: senderType,
        user_id: senderType !== 'system' ? customer : undefined,
        name: senderType === 'system' ? 'سیستم' : 'مدیر سایت',
      },
      actions,
      retry_count: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0,
      last_retry_at: undefined,
      metadata: {
        source: 'notification-service-v1',
        correlation_id: `corr-${Date.now()}-${i}`,
        user_agent: 'Node.js Seeder',
        ip_address: '127.0.0.1',
        device_info: { platform: 'web', seed: true },
      },
      status,
      deleted: false,
      analytics: {
        impressions: Math.floor(Math.random() * 10),
        clicks: clicked ? 1 : 0,
        conversions: clicked ? 1 : 0,
      },
      createdAt,
      updatedAt: createdAt,
    };

    if (notification.retry_count > 0) {
      notification.last_retry_at = randomPastDate();
    }

    notifications.push(notification);
  }

  return notifications;
};

// Seeder Function
const seedNotifications = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/yourdbname');

    // Optional: Clear existing seeded data (or all data)
    const deleteCondition = { 'metadata.source': 'notification-service-v1' }; // Only delete seeded ones
    await Notification.deleteMany(deleteCondition);
    console.log('Previous seeded notifications cleared.');

    // Generate data
    const notifications = generateSeedData();

    // Insert data
    await Notification.insertMany(notifications);
    console.log('✅ 15 Notifications seeded successfully!');

    // Disconnect
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedNotifications();
}

// Export for use in other scripts (e.g., npm run seed:notifications)
module.exports = seedNotifications;

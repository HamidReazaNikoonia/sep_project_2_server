// models/Notification.js
const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');

const notificationSchema = new mongoose.Schema(
  {
    // Core recipient information
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Notification categorization
    notification_type: {
      type: String,
      enum: [
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
        'order_status_update',
      ],
      required: true,
      index: true,
    },

    // Priority level
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },

    // Core message content
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },

    message: {
      type: String,
      required: true,
      maxlength: 500,
    },

    // Rich content support
    content: {
      html_body: String, // For rich HTML emails
      short_text: String, // For SMS/push notifications
      action_url: String, // Deep link or web URL
      image_url: String, // For notifications with images
      data: mongoose.Schema.Types.Mixed, // Custom payload data
    },

    // Delivery channels
    channels: {
      type: [
        {
          type: String,
          enum: ['sms', 'email', 'push', 'in_app', 'webhook'],
        },
      ],
      required: true,
      default: ['in_app'],
    },

    // Delivery status tracking
    delivery_status: {
      sms: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed', 'not_sent'],
          default: 'not_sent',
        },
        sent_at: Date,
        delivered_at: Date,
        error_message: String,
        provider_response: mongoose.Schema.Types.Mixed,
      },
      email: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'not_sent'],
          default: 'not_sent',
        },
        sent_at: Date,
        delivered_at: Date,
        opened_at: Date,
        clicked_at: Date,
        error_message: String,
        provider_response: mongoose.Schema.Types.Mixed,
      },
      push: {
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'clicked', 'failed', 'not_sent'],
          default: 'not_sent',
        },
        sent_at: Date,
        delivered_at: Date,
        clicked_at: Date,
        error_message: String,
        provider_response: mongoose.Schema.Types.Mixed,
      },
      in_app: {
        status: {
          type: String,
          enum: ['pending', 'delivered', 'read', 'not_sent'],
          default: 'delivered',
        },
        delivered_at: {
          type: Date,
          default: Date.now,
        },
        read_at: Date,
      },
    },

    // User interaction tracking
    read_status: {
      type: Boolean,
      default: false,
      index: true,
    },

    read_at: Date,

    clicked: {
      type: Boolean,
      default: false,
    },

    clicked_at: Date,

    // Scheduling
    scheduled_for: {
      type: Date,
      index: true,
    },

    expires_at: {
      type: Date,
      index: true,
    },

    // State and context data
    state: {
      reference_id: String,
      order_id: String,
      course_id: String,
      session_id: String,
      transaction_id: String,
      startTime: Date,
      endTime: Date,
      custom_data: mongoose.Schema.Types.Mixed,
    },

    // Template and personalization
    template_id: String,
    template_variables: mongoose.Schema.Types.Mixed,
    language: {
      type: String,
      default: 'fa', // Persian as default
      enum: ['fa', 'en'],
    },

    // Grouping and batching
    campaign_id: String,
    batch_id: String,
    group_key: String, // For grouping related notifications

    // Sender information
    sender: {
      type: {
        type: String,
        enum: ['system', 'admin', 'coach', 'automated'],
        default: 'system',
      },
      user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      name: String,
    },

    // Actions and CTAs
    actions: [
      {
        id: String,
        label: String,
        url: String,
        style: {
          type: String,
          enum: ['primary', 'secondary', 'danger', 'success'],
          default: 'primary',
        },
      },
    ],

    // Retry mechanism
    retry_count: {
      type: Number,
      default: 0,
      max: 5,
    },

    last_retry_at: Date,

    // Metadata
    metadata: {
      source: String, // Which service/module created this notification
      correlation_id: String, // For tracing across services
      user_agent: String,
      ip_address: String,
      device_info: mongoose.Schema.Types.Mixed,
    },

    // Status and lifecycle
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'expired'],
      default: 'processing',
      index: true,
    },

    // Soft delete
    deleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deleted_at: Date,

    // Analytics and tracking
    analytics: {
      impressions: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      conversions: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
notificationSchema.index({ customer: 1, createdAt: -1 });
notificationSchema.index({ customer: 1, read_status: 1 });
notificationSchema.index({ notification_type: 1, status: 1 });
notificationSchema.index({ scheduled_for: 1, status: 1 });
notificationSchema.index({ expires_at: 1 });
notificationSchema.index({ 'state.reference_id': 1 });
notificationSchema.index({ campaign_id: 1 });
notificationSchema.index({ deleted: 1, createdAt: -1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('is_expired').get(function () {
  return this.expires_at && this.expires_at < new Date();
});

// Virtual for overall delivery status
notificationSchema.virtual('overall_status').get(function () {
  const statuses = [];

  if (this.channels.includes('sms')) statuses.push(this.delivery_status.sms.status);
  if (this.channels.includes('email')) statuses.push(this.delivery_status.email.status);
  if (this.channels.includes('push')) statuses.push(this.delivery_status.push.status);
  if (this.channels.includes('in_app')) statuses.push(this.delivery_status.in_app.status);

  if (statuses.every((s) => s === 'delivered' || s === 'read' || s === 'opened')) return 'delivered';
  if (statuses.some((s) => s === 'failed')) return 'partially_failed';
  if (statuses.every((s) => s === 'failed')) return 'failed';
  if (statuses.some((s) => s === 'sent' || s === 'delivered')) return 'in_progress';

  return 'pending';
});

// Pre-save middleware
notificationSchema.pre('save', function (next) {
  // Set read_at when read_status changes to true
  if (this.isModified('read_status') && this.read_status && !this.read_at) {
    this.read_at = new Date();
  }

  // Set clicked_at when clicked changes to true
  if (this.isModified('clicked') && this.clicked && !this.clicked_at) {
    this.clicked_at = new Date();
  }

  // Auto-expire old notifications
  if (!this.expires_at && this.notification_type !== 'from_admin') {
    this.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  next();
});

// Static methods
notificationSchema.statics.markAsRead = function (notificationId, userId) {
  return this.findOneAndUpdate(
    { _id: notificationId, customer: userId },
    {
      read_status: true,
      read_at: new Date(),
      'delivery_status.in_app.status': 'read',
      'delivery_status.in_app.read_at': new Date(),
    },
    { new: true }
  );
};

notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    customer: userId,
    read_status: false,
    deleted: false,
    $or: [{ expires_at: { $exists: false } }, { expires_at: { $gt: new Date() } }],
  });
};

notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { customer: userId, read_status: false },
    {
      read_status: true,
      read_at: new Date(),
      'delivery_status.in_app.status': 'read',
      'delivery_status.in_app.read_at': new Date(),
    }
  );
};

// Instance methods
notificationSchema.methods.markAsClicked = function () {
  this.clicked = true;
  this.clicked_at = new Date();
  this.analytics.clicks += 1;
  return this.save();
};

notificationSchema.methods.incrementImpressions = function () {
  this.analytics.impressions += 1;
  return this.save();
};

// Plugins
notificationSchema.plugin(toJSON);
notificationSchema.plugin(paginate);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;

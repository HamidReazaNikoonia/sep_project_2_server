const mongoose = require('mongoose');
const { toJSON, paginate } = require('../../models/plugins');
const User = require('../../models/user.model');

const { Schema } = mongoose;

// Ticket Reply Schema
const ticketReplySchema = new Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      autopopulate: true,
    },
    sender_type: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Upload',
        autopopulate: true,
      },
    ],
    is_read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Main Ticket Schema
const ticketSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    // User who created the ticket
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      autopopulate: true,
    },

    // Related program information
    program_id: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },
    program_type: {
      type: String,
      enum: ['course', 'course_session'],
      required() {
        return this.program_id != null;
      },
    },

    // Related course information (for both course and course_session)
    course_id: {
      type: Schema.Types.ObjectId,
      required: false,
      index: true,
    },

    // Ticket status
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },

    // Priority level
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },

    // Category for ticket classification
    category: {
      type: String,
      enum: [
        'technical_support',
        'course_content',
        'payment_issue',
        'access_problem',
        'general_inquiry',
        'bug_report',
        'feature_request',
        'other',
      ],
      default: 'general_inquiry',
    },

    // Attachments for initial ticket
    attachments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Upload',
        autopopulate: true,
      },
    ],

    // Replies to the ticket
    replies: [ticketReplySchema],

    // Admin assignment
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      autopopulate: true,
    },

    // Read status
    is_read_by_admin: {
      type: Boolean,
      default: false,
      index: true,
    },
    is_read_by_user: {
      type: Boolean,
      default: true, // User creates it, so they've read it
    },

    // Last activity tracking
    last_reply_at: {
      type: Date,
      default: Date.now,
    },
    last_reply_by: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },

    // Resolution details
    resolved_at: {
      type: Date,
      required: false,
    },
    resolved_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    resolution_notes: {
      type: String,
      required: false,
      maxlength: 1000,
    },

    // Soft delete
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deleted_at: {
      type: Date,
      required: false,
    },
    deleted_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add plugins
ticketSchema.plugin(toJSON);
ticketSchema.plugin(paginate);

// Indexes for better performance
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ program_id: 1, program_type: 1 });
ticketSchema.index({ course_id: 1 });
ticketSchema.index({ is_read_by_admin: 1 });
ticketSchema.index({ last_reply_at: -1 });
ticketSchema.index({ createdAt: -1 });

// Virtual for unread replies count
ticketSchema.virtual('unread_replies_count').get(function () {
  return this.replies.filter((reply) => !reply.is_read).length;
});

// Virtual for total replies count
ticketSchema.virtual('replies_count').get(function () {
  return this.replies.length;
});

// Pre-save middleware to update last_reply_at and last_reply_by
ticketSchema.pre('save', function (next) {
  if (this.isModified('replies') && this.replies.length > 0) {
    const lastReply = this.replies[this.replies.length - 1];
    this.last_reply_at = lastReply.createdAt || new Date();
    this.last_reply_by = lastReply.sender_type;

    // Update read status based on who replied
    if (lastReply.sender_type === 'admin') {
      this.is_read_by_user = false;
    } else {
      this.is_read_by_admin = false;
    }
  }
  next();
});

// Static method to get tickets with filters
ticketSchema.statics.findWithFilters = async function (filters = {}, options = {}) {
  const query = { is_deleted: false };

  // Apply filters
  if (filters.user) query.user = filters.user;
  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.category) query.category = filters.category;
  if (filters.program_id) query.program_id = filters.program_id;
  if (filters.program_type) query.program_type = filters.program_type;
  if (filters.course_id) query.course_id = filters.course_id;
  if (filters.assigned_to) query.assigned_to = filters.assigned_to;
  if (filters.is_read_by_admin !== undefined) query.is_read_by_admin = filters.is_read_by_admin;

  // Date range filters
  if (filters.created_from_date || filters.created_to_date) {
    query.createdAt = {};
    if (filters.created_from_date) query.createdAt.$gte = new Date(filters.created_from_date);
    if (filters.created_to_date) query.createdAt.$lte = new Date(filters.created_to_date);
  }

  // Handle search filter (search in ticket fields and user fields)
  if (filters.search) {
    const searchTerm = filters.search.trim();
    if (searchTerm) {
      // First, find users that match the search criteria
      const userSearchQuery = {
        $or: [{ first_name: { $regex: searchTerm, $options: 'i' } }, { last_name: { $regex: searchTerm, $options: 'i' } }],
      };

      const matchingUsers = await User.find(userSearchQuery, '_id');
      const userIds = matchingUsers.map((user) => user._id);

      // Create search query that includes both ticket fields and user matches
      query.$or = [{ title: { $regex: searchTerm, $options: 'i' } }, { description: { $regex: searchTerm, $options: 'i' } }];

      // If we found matching users, add them to the search
      if (userIds.length > 0) {
        query.$or.push({ user: { $in: userIds } });
      }
    }
  }

  return this.paginate(query, {
    ...options,
    populate: 'user assigned_to',
  });
};

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;

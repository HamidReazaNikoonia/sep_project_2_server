const httpStatus = require('http-status');
const Ticket = require('./ticket.model');
const ApiError = require('../../utils/ApiError');
const { getUserById } = require('../../services/user.service');

/**
 * Create a ticket
 * @param {Object} ticketBody
 * @param {string} userId
 * @returns {Promise<Ticket>}
 */
const createTicket = async (ticketBody, userId) => {
  // Verify user exists
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Validate program and course relationship if provided
  // if (ticketBody.program_id && ticketBody.program_type) {
  //   let programModel;
  //   if (ticketBody.program_type === 'course') {
  //     programModel = require('../Course/course.model');
  //   } else if (ticketBody.program_type === 'course_session') {
  //     programModel = require('../Course_Session/courseSession.model');
  //   }

  //   if (programModel) {
  //     const program = await programModel.findById(ticketBody.program_id);
  //     if (!program) {
  //       throw new ApiError(httpStatus.NOT_FOUND, `${ticketBody.program_type} program not found`);
  //     }
  //   }
  // }

  const ticketData = {
    ...ticketBody,
    user: userId,
    is_read_by_user: true,
    is_read_by_admin: false,
  };

  const ticket = await Ticket.create(ticketData);
  return ticket;
};

/**
 * Query for tickets with filters and pagination
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const queryTickets = async (filter, options) => {
  const tickets = await Ticket.findWithFilters(filter, options);
  return tickets;
};

/**
 * Get ticket by id
 * @param {ObjectId} id
 * @param {string} userRole
 * @param {string} userId
 * @returns {Promise<Ticket>}
 */
const getTicketById = async (id, userRole = 'user', userId = null) => {
  const ticket = await Ticket.findById(id)
    .populate('assigned_to', 'first_name last_name avatar mobile id role')
    .populate('user', 'first_name last_name avatar mobile id student_id role')
    .populate('attachments')
    .populate('program_id', 'id')
    .populate('resolved_by')
    .populate('deleted_by')
    .populate({
      path: 'program_id',
      populate: [
        { path: 'course', select: 'title' },
        { path: 'coach', select: 'first_name last_name mobile' },
      ],
    })
    .populate('replies.sender')
    .populate('replies.attachments');

  if (!ticket || ticket.is_deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  // Check permissions - users can only see their own tickets
  if (userRole === 'user' && ticket.user._id.toString() !== userId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied');
  }

  return ticket;
};

/**
 * Update ticket by id
 * @param {ObjectId} ticketId
 * @param {Object} updateBody
 * @param {string} userRole
 * @param {string} userId
 * @returns {Promise<Ticket>}
 */
const updateTicketById = async (ticketId, updateBody, userRole = 'admin', userId = null) => {
  const ticket = await getTicketById(ticketId, userRole, userId);

  // Only admins can update most fields
  if (userRole !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only admins can update tickets');
  }

  // Handle status changes
  if (updateBody.status === 'resolved' || updateBody.status === 'closed') {
    // eslint-disable-next-line no-param-reassign
    updateBody.resolved_at = new Date();
    // eslint-disable-next-line no-param-reassign
    updateBody.resolved_by = userId;
  }

  Object.assign(ticket, updateBody);
  await ticket.save();
  return ticket;
};

/**
 * Reply to a ticket
 * @param {ObjectId} ticketId
 * @param {Object} replyBody
 * @param {string} userId
 * @param {string} userRole
 * @returns {Promise<Ticket>}
 */
const replyToTicket = async (ticketId, replyBody, userId, userRole = 'user') => {
  const ticket = await getTicketById(ticketId, userRole, userRole === 'user' ? userId : null);

  // Check if ticket is closed
  if (ticket.status === 'closed') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot reply to a closed ticket');
  }

  const reply = {
    message: replyBody.message,
    sender: userId,
    sender_type: userRole === 'admin' ? 'admin' : 'user',
    attachments: replyBody.attachments || [],
    is_read: false,
  };

  ticket.replies.push(reply);

  // Update ticket status if admin is replying
  if (userRole === 'admin' && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  await ticket.save();
  return ticket;
};

/**
 * Mark ticket as read
 * @param {ObjectId} ticketId
 * @param {string} userRole
 * @param {string} userId
 * @returns {Promise<Ticket>}
 */
const markTicketAsRead = async (ticketId, userRole = 'user', userId = null) => {
  const ticket = await getTicketById(ticketId, userRole, userRole === 'user' ? userId : null);

  if (userRole === 'admin') {
    ticket.is_read_by_admin = true;
    // Mark all replies as read by admin
    ticket.replies.forEach((reply) => {
      if (reply.sender_type === 'user') {
        // eslint-disable-next-line no-param-reassign
        reply.is_read = true;
      }
    });
  } else {
    ticket.is_read_by_user = true;
    // Mark all admin replies as read
    ticket.replies.forEach((reply) => {
      if (reply.sender_type === 'admin') {
        // eslint-disable-next-line no-param-reassign
        reply.is_read = true;
      }
    });
  }

  await ticket.save();
  return ticket;
};

/**
 * Get user's own tickets
 * @param {string} userId
 * @param {Object} filter
 * @param {Object} options
 * @returns {Promise<QueryResult>}
 */
const getUserTickets = async (userId, filter = {}, options = {}) => {
  const userFilter = { ...filter, user: userId };
  return queryTickets(userFilter, options);
};

/**
 * Soft delete ticket by id
 * @param {ObjectId} ticketId
 * @param {string} userId - Admin user ID
 * @returns {Promise<Ticket>}
 */
const deleteTicketById = async (ticketId, userId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket || ticket.is_deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  ticket.is_deleted = true;
  ticket.deleted_at = new Date();
  ticket.deleted_by = userId;
  await ticket.save();

  return ticket;
};

/**
 * Get ticket statistics
 * @returns {Promise<Object>}
 */
const getTicketStatistics = async () => {
  const stats = await Ticket.aggregate([
    { $match: { is_deleted: false } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        unread_by_admin: { $sum: { $cond: [{ $eq: ['$is_read_by_admin', false] }, 1, 0] } },
        high_priority: { $sum: { $cond: [{ $in: ['$priority', ['high', 'urgent']] }, 1, 0] } },
      },
    },
  ]);

  return (
    stats[0] || {
      total: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
      unread_by_admin: 0,
      high_priority: 0,
    }
  );
};

/**
 * Assign ticket to admin
 * @param {ObjectId} ticketId
 * @param {ObjectId} adminId
 * @returns {Promise<Ticket>}
 */
const assignTicket = async (ticketId, adminId) => {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket || ticket.is_deleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }

  // Verify admin exists
  const admin = await getUserById(adminId);
  if (!admin || admin.role !== 'admin') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid admin user');
  }

  ticket.assigned_to = adminId;
  if (ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  await ticket.save();
  return ticket;
};

module.exports = {
  createTicket,
  queryTickets,
  getTicketById,
  updateTicketById,
  replyToTicket,
  markTicketAsRead,
  getUserTickets,
  deleteTicketById,
  getTicketStatistics,
  assignTicket,
};

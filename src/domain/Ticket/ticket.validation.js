const Joi = require('joi');
const { objectId } = require('../../validations/custom.validation');

const createTicket = {
  body: Joi.object().keys({
    title: Joi.string().trim().required().min(3).max(200),
    description: Joi.string().trim().required().min(10).max(2000),
    program_id: Joi.string().custom(objectId).optional(),
    program_type: Joi.string().valid('course', 'course_session').when('program_id', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    course_id: Joi.string().custom(objectId).optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    category: Joi.string()
      .valid(
        'technical_support',
        'course_content',
        'payment_issue',
        'access_problem',
        'general_inquiry',
        'bug_report',
        'feature_request',
        'other'
      )
      .optional(),
    attachments: Joi.array().items(Joi.string().custom(objectId)).optional(),
  }),
};

const getTickets = {
  query: Joi.object().keys({
    user: Joi.string().custom(objectId).optional(),
    status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    category: Joi.string()
      .valid(
        'technical_support',
        'course_content',
        'payment_issue',
        'access_problem',
        'general_inquiry',
        'bug_report',
        'feature_request',
        'other'
      )
      .optional(),
    program_id: Joi.string().custom(objectId).optional(),
    program_type: Joi.string().valid('course', 'course_session').optional(),
    course_id: Joi.string().custom(objectId).optional(),
    assigned_to: Joi.string().custom(objectId).optional(),
    is_read_by_admin: Joi.boolean().optional(),
    created_from_date: Joi.date().optional(),
    created_to_date: Joi.date().optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    page: Joi.number().integer().min(1).optional(),
    search: Joi.string().optional(),
    q: Joi.string().optional(),
    sort_by: Joi.string().optional(),
  }),
};

const getTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
};

const updateTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').optional(),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
      category: Joi.string()
        .valid(
          'technical_support',
          'course_content',
          'payment_issue',
          'access_problem',
          'general_inquiry',
          'bug_report',
          'feature_request',
          'other'
        )
        .optional(),
      assigned_to: Joi.string().custom(objectId).allow(null).optional(),
      resolution_notes: Joi.string().max(1000).optional(),
    })
    .min(1),
};

const replyToTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    message: Joi.string().trim().required().min(1).max(2000),
    attachments: Joi.array().items(Joi.string().custom(objectId)).optional(),
  }),
};

const markAsRead = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
};

const deleteTicket = {
  params: Joi.object().keys({
    ticketId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createTicket,
  getTickets,
  getTicket,
  updateTicket,
  replyToTicket,
  markAsRead,
  deleteTicket,
};

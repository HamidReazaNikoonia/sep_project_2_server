const httpStatus = require('http-status');
const pick = require('../../utils/pick');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const ticketService = require('./ticket.service');

const createTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.createTicket(req.body, req.user.id);
  res.status(httpStatus.CREATED).send(ticket);
});

const getTickets = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'user',
    'status',
    'priority',
    'category',
    'program_id',
    'program_type',
    'course_id',
    'assigned_to',
    'is_read_by_admin',
    'created_from_date',
    'created_to_date',
  ]);

  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Set default sorting
  if (!options.sortBy) {
    options.sortBy = 'last_reply_at:desc';
  }

  const result = await ticketService.queryTickets(filter, options);
  res.send(result);
});

const getUserTickets = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['status', 'priority', 'category', 'program_id', 'program_type', 'course_id']);

  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  // Set default sorting
  if (!options.sortBy) {
    options.sortBy = 'last_reply_at:desc';
  }

  const result = await ticketService.getUserTickets(req.user.id, filter, options);
  res.send(result);
});

const getTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.ticketId, req.user.role, req.user.id);
  if (!ticket) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Ticket not found');
  }
  res.send(ticket);
});

const updateTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.updateTicketById(req.params.ticketId, req.body, req.user.role, req.user.id);
  res.send(ticket);
});

const replyToTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.replyToTicket(req.params.ticketId, req.body, req.user.id, req.user.role);
  res.send(ticket);
});

const markAsRead = catchAsync(async (req, res) => {
  const ticket = await ticketService.markTicketAsRead(req.params.ticketId, req.user.role, req.user.id);
  res.send(ticket);
});

const deleteTicket = catchAsync(async (req, res) => {
  await ticketService.deleteTicketById(req.params.ticketId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const getTicketStatistics = catchAsync(async (req, res) => {
  const statistics = await ticketService.getTicketStatistics();
  res.send(statistics);
});

const assignTicket = catchAsync(async (req, res) => {
  const ticket = await ticketService.assignTicket(req.params.ticketId, req.body.adminId);
  res.send(ticket);
});

module.exports = {
  createTicket,
  getTickets,
  getUserTickets,
  getTicket,
  updateTicket,
  replyToTicket,
  markAsRead,
  deleteTicket,
  getTicketStatistics,
  assignTicket,
};

const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ticketValidation = require('./ticket.validation');
const ticketController = require('./ticket.controller');

const router = express.Router();

// User routes - authenticated users only
router
  .route('/')
  .post(auth(), validate(ticketValidation.createTicket), ticketController.createTicket)
  .get(auth(), validate(ticketValidation.getTickets), ticketController.getUserTickets);

router.route('/:ticketId').get(auth(), validate(ticketValidation.getTicket), ticketController.getTicket);

router.route('/:ticketId/reply').post(auth(), validate(ticketValidation.replyToTicket), ticketController.replyToTicket);

router.route('/:ticketId/mark-read').patch(auth(), validate(ticketValidation.markAsRead), ticketController.markAsRead);

// Admin routes - admin only
router.route('/admin/all').get(auth('manageUsers'), validate(ticketValidation.getTickets), ticketController.getTickets);

router.route('/admin/statistics').get(auth('manageUsers'), ticketController.getTicketStatistics);

router
  .route('/admin/:ticketId')
  .get(auth('manageUsers'), validate(ticketValidation.getTicket), ticketController.getTicket)
  .patch(auth('manageUsers'), validate(ticketValidation.updateTicket), ticketController.updateTicket)
  .delete(auth('manageUsers'), validate(ticketValidation.deleteTicket), ticketController.deleteTicket);

router
  .route('/admin/:ticketId/reply')
  .post(auth('manageUsers'), validate(ticketValidation.replyToTicket), ticketController.replyToTicket);

router.route('/admin/:ticketId/assign').patch(auth('manageUsers'), ticketController.assignTicket);

router
  .route('/admin/:ticketId/mark-read')
  .patch(auth('manageUsers'), validate(ticketValidation.markAsRead), ticketController.markAsRead);

module.exports = router;

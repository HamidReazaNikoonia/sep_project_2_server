# Ticket System Documentation

## Overview
The Ticket system allows users to create support tickets for courses and course sessions they have purchased. Admins can view, reply to, and manage all tickets.

## Features

### User Features
- Create tickets for purchased courses/programs
- View their own tickets with replies
- Reply to tickets
- Mark tickets as read
- Attach files to tickets and replies

### Admin Features
- View all tickets with advanced filtering
- Reply to tickets
- Update ticket status and priority
- Assign tickets to specific admins
- View ticket statistics
- Soft delete tickets

## API Endpoints

### User Endpoints
- `POST /api/v1/ticket` - Create a new ticket
- `GET /api/v1/ticket` - Get user's own tickets
- `GET /api/v1/ticket/:ticketId` - Get specific ticket
- `POST /api/v1/ticket/:ticketId/reply` - Reply to ticket
- `PATCH /api/v1/ticket/:ticketId/mark-read` - Mark ticket as read

### Admin Endpoints
- `GET /api/v1/ticket/admin/all` - Get all tickets with filters
- `GET /api/v1/ticket/admin/statistics` - Get ticket statistics
- `GET /api/v1/ticket/admin/:ticketId` - Get specific ticket (admin view)
- `PATCH /api/v1/ticket/admin/:ticketId` - Update ticket
- `DELETE /api/v1/ticket/admin/:ticketId` - Delete ticket
- `POST /api/v1/ticket/admin/:ticketId/reply` - Admin reply to ticket
- `PATCH /api/v1/ticket/admin/:ticketId/assign` - Assign ticket to admin
- `PATCH /api/v1/ticket/admin/:ticketId/mark-read` - Mark ticket as read by admin

## Ticket Model Properties

### Core Properties
- `title` - Ticket title (required)
- `description` - Ticket description (required)
- `user` - User who created the ticket (required)
- `status` - open, in_progress, resolved, closed
- `priority` - low, medium, high, urgent
- `category` - technical_support, course_content, payment_issue, etc.

### Program Relations
- `program_id` - ID of related course or course_session
- `program_type` - 'course' or 'course_session'
- `course_id` - Related course ID

### Admin Features
- `assigned_to` - Admin assigned to ticket
- `is_read_by_admin` - Admin read status
- `is_read_by_user` - User read status
- `replies` - Array of ticket replies
- `attachments` - File attachments

### Tracking
- `last_reply_at` - Last reply timestamp
- `last_reply_by` - 'user' or 'admin'
- `resolved_at` - Resolution timestamp
- `resolved_by` - Admin who resolved ticket

## Usage Examples

### Create a ticket for a course
```javascript
POST /api/v1/ticket
{
  "title": "Course video not loading",
  "description": "I cannot access video lesson 3 in the JavaScript course",
  "program_id": "60a7c5f4e8b6c12345678901",
  "program_type": "course",
  "course_id": "60a7c5f4e8b6c12345678901",
  "category": "technical_support",
  "priority": "medium"
}
```

### Admin reply to ticket
```javascript
POST /api/v1/ticket/admin/60a7c5f4e8b6c12345678902/reply
{
  "message": "We're looking into this issue. Please try clearing your browser cache and let us know if the problem persists."
}
```

### Get tickets with filters
```javascript
GET /api/v1/ticket/admin/all?status=open&priority=high&limit=20&page=1
```

## Integration Notes

### With Course System
When users create tickets, they can reference specific courses or course sessions they have purchased. This creates a direct relationship for support context.

### With Notification System
The ticket system can be integrated with the notification system to:
- Notify admins of new tickets
- Notify users of admin replies
- Send escalation notifications for urgent tickets

### With User System
Tickets are tied to users and respect user permissions. Users can only see their own tickets, while admins can see all tickets.

## Database Indexes
The model includes optimized indexes for:
- User-based queries
- Status and priority filtering
- Program and course relations
- Read status tracking
- Date-based sorting

## Security Features
- User isolation (users can only access their own tickets)
- Role-based access control
- Input validation and sanitization
- Soft delete for data retention
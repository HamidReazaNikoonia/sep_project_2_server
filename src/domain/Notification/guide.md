# Notification Domain


### Routes

* create Notification By Admin

* get all notification related to specific customer


based on the Notification Model @notification.model.js

I want to implement

1- Notification Routes
2- Notification Controller
3- Notification Services


** All the Logic  That nessesarry ( include endpoint and controller and service code ) **

1- Get ( List ) All Notification by Filters and pagination ( use paginate mongoose plugin )
 - Filter by important filed like (customer, notification_type, status, is_deleted, delivery_status, read_status, is_expire, sender)

2- Create New Notification ( POST endpoint )

** Services  ( method that we use in the project ) **

1- Implement Notification ( a function that we call it in the project, when user have actions )

user actions include
- when user login
- when user login for first time
- when user update profile
- when user profile verified by admin
- when user create order
- when user checkout order ( success / fail )
- when user chekout course-session program
- when course-session program , session is close ( 1 day before / 1 hour before )
- when course-session program , session complete
- when course-session program , session canceled by admin
- when new course-session program , session implement (push) by admin
- when admin answer user Ticket



## Service Example

```javascript
// In your auth service
const notificationService = require('../domain/Notification/notification.service');

// When user logs in
await notificationService.sendLoginNotification(userId, isFirstTime, { ip_address: req.ip });

// In your order service
// When order is created
await notificationService.sendOrderCreationNotification(userId, orderId, { reference: orderReference });

// When payment is processed
await notificationService.sendPaymentNotification(userId, orderId, isSuccess, {
  amount: paymentAmount,
  transactionId: transactionId
});

// In your course service
// When user enrolls
await notificationService.sendCourseEnrollmentNotification(userId, programId, {
  title: courseTitle,
  courseId: courseId
});

// In your session service
// Session reminder (scheduled job)
await notificationService.sendSessionReminderNotification(userId, sessionId, {
  title: sessionTitle,
  startTime: sessionStartTime,
  reminderTime: reminderTime
}, '1hour');

// Session completion
await notificationService.sendSessionCompletionNotification(userId, sessionId, {
  title: sessionTitle
});
```
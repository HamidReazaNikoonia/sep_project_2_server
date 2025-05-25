// services/notificationService.js
const Notification = require('../../domain/Notification/notification.model');
const cron = require('node-cron');
const mongoose = require('mongoose');
const UserModel = require('../../models/user.model'); // Adjust this import as needed

const  { Send } = require('../sms/smsProvider');

// Placeholder functions for SMS, Email, and Push notification sending
async function sendSMS(user, message) {
  try {
    console.log(`Sending SMS to ${user.mobile}: ${message}`);
    // Implement actual SMS logic here (e.g., using Twilio or another provider)
    const sender = await Send(user.mobile, message);
    console.log({ sender });
  } catch (error) {
    console.log(error);
    console.log('**************************');
    console.log('error will be happen throw SMS provider sender');
  }
}

async function sendEmail(user, message) {
  console.log(`Sending Email to ${user.email}: ${message}`);
  // Implement actual Email logic here (e.g., using Nodemailer or another provider)
}

async function sendPushNotification(user, message) {
  console.log(`Sending Push Notification to ${user.deviceToken}: ${message}`);
  // Implement actual Push Notification logic here (e.g., Firebase or another service)
}

async function createNotificationService(user_id, notification_type, state, sendBy) {
  try {
    // Store notification in the database
    const notification = new Notification({
      customer: user_id,
      notification_type,
      state,
      sendBy,
    });
    await notification.save();

    // Retrieve user details (assuming User model is available)

    const user = await UserModel.findById(user_id);
    if (!user) throw new Error('User not found');

    let message = '';

    if (notification_type === 'success_create_reference') {
      // CASE 1
      // in this case user create reference successfully and payment in zarinpal also create successfully with status code 100
      // but payment status in the reference DOC not change
      if (state?.payment_status_zarinpal && !state?.payment_status) {
        message = `your payment did successfully with the bank but for some reason your reference status didnt change, ref_code is ${state.follow_up_code}`;
      }

      // case 2
      // in this case user create reference succesfully and payment also be successfull
      if (notification_type === 'success_create_reference' && state?.payment_status_zarinpal && state?.payment_status) {
        message = `your payment did successfull, please go for implement session and select time slot ref_code is ${state.follow_up_code}`;
      }
    } else if (notification_type === 'payment_fail_create_reference') {
      message = `your payment fail, your payment will be back to your account after 72 hours, ref_code is ${state.follow_up_code}`;
    }

    // Generate notification message template based on `notification_type`
    // const messageTemplate = {
    //   success_create_reference: `Your operation was successful. this is your follow up code: ${state.follow_up_code} and this is the date of consult ${state.date} - ${state.startTime}`,
    //   alert: `Alert! Please check your account. Reference ID: ${state.reference_id}`,
    // };
    // message = messageTemplate[notification_type];

    // Send notifications based on the channels in `sendBy`
    if (sendBy.includes('SMS')) await sendSMS(user, message);
    // if (sendBy.includes('Email')) await sendEmail(user, message);
    // if (sendBy.includes('Push')) await sendPushNotification(user, message);

    console.log('Immediate notification created and sent successfully');
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// Function to send a notification to the user based on the sendBy channels
async function sendScheduledNotification(notification, timeFrame) {
  try {
    const user = await UserModel.findById(notification.customer);
    if (!user) throw new Error('User not found');

    // Generate notification message template
    const timeMessages = {
      oneDay: 'Your operation is scheduled to start tomorrow. ',
      oneHour: 'Your operation is scheduled to start in one hour. ',
    };
    const messageTemplate = {
      success: `${timeMessages[timeFrame]}Reference ID: ${notification.state.reference_id}`,
      alert: `${timeMessages[timeFrame]}Please check your account. Reference ID: ${notification.state.reference_id}`,
    };
    const message = messageTemplate[notification.notification_type];

    // Send notifications based on the channels in `sendBy`
    if (notification.sendBy.includes('SMS')) await sendSMS(user, message);
    if (notification.sendBy.includes('Email')) await sendEmail(user, message);
    if (notification.sendBy.includes('Push')) await sendPushNotification(user, message);

    console.log(`Scheduled ${timeFrame} notification sent successfully for Notification ID: ${notification._id}`);
  } catch (error) {
    console.error('Error sending scheduled notification:', error);
  }
}

// Cron job to check for notifications that need to be sent 1 day and 1 hour before `startTime`
cron.schedule('0 * * * *', async () => {
  console.log('Running scheduled notification check');

  const now = new Date();
  const oneDayAhead = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneHourAhead = new Date(now.getTime() + 60 * 60 * 1000);

  try {
    // Find notifications that need to be sent 1 day before their `startTime`
    const oneDayNotifications = await Notification.find({
      'state.startTime': { $gte: oneDayAhead, $lt: new Date(oneDayAhead.getTime() + 60 * 60 * 1000) },
    });

    // Find notifications that need to be sent 1 hour before their `startTime`
    const oneHourNotifications = await Notification.find({
      'state.startTime': { $gte: oneHourAhead, $lt: new Date(oneHourAhead.getTime() + 60 * 60 * 1000) },
    });

    // Send notifications for each one found in the 1-day check
    for (const notification of oneDayNotifications) {
      await sendScheduledNotification(notification, 'oneDay');
    }

    // Send notifications for each one found in the 1-hour check
    for (const notification of oneHourNotifications) {
      await sendScheduledNotification(notification, 'oneHour');
    }
  } catch (error) {
    console.error('Error during scheduled notification check:', error);
  }
});

module.exports = { createNotificationService };

/* eslint-disable no-console */
/* eslint-disable camelcase */
// seeders/seedTickets.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Ticket = require('../domain/Ticket/ticket.model'); // Adjust path as needed
// const { ticketReplySchema } = require('../domain/Ticket/ticket.model'); // Or extract from Ticket model if defined separately

// Provided IDs
const USER_IDS = ['67976d05a41ee135e561b809', '679d440c18c8446a24186c36', '68467788186e0cb691a16f83'];

const COURSE_IDS = ['6843b58fd8e1902c7d162e75', '6843b676d8e1902c7d162e8c', '6843cabec8b36b2417f13236'];

// Helpers
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBool = (chance = 0.5) => Math.random() < chance;

// Random date within the last N days
const randomPastDate = (days = 7) => {
  const date = new Date();
  date.setHours(date.getHours() - Math.floor(Math.random() * 24 * days));
  return date;
};

// Random future date (for resolved tickets)
const randomFutureDate = (days = 1) => {
  const date = new Date();
  date.setDate(date.getDate() + Math.floor(Math.random() * days));
  return date > new Date() ? date : new Date();
};

// Generate fake message
const generateMessage = (subject) => {
  const sentences = {
    technical_support: 'من در هنگام ورود به پلتفرم با خطای 500 مواجه می‌شوم.',
    course_content: 'ویدیوی جلسه ۳ قابل پخش نیست.',
    payment_issue: 'پرداخت من ثبت شده اما دوره فعال نشده است.',
    access_problem: 'دسترسی به جلسه بعدی را ندارم.',
    general_inquiry: 'سلام، سوالی درباره نحوه ثبت‌نام داشتم.',
    bug_report: 'در صفحه پروفایل، دکمه ذخیره کار نمی‌کند.',
    feature_request: 'پیشنهاد می‌کنم امکان دانلود ویدیوها اضافه شود.',
    other: 'موضوع دیگری دارم که می‌خواهم اطلاع دهم.',
  };
  return sentences[subject] || 'این یک تیکت آزمایشی است.';
};

// Generate random title
const generateTitle = (category) => {
  const titles = {
    technical_support: 'خطا در ورود به سایت',
    course_content: 'ویدیوی جلسه قابل پخش نیست',
    payment_issue: 'پرداخت انجام شد اما دوره فعال نشد',
    access_problem: 'دسترسی به جلسه بعدی مسدود است',
    general_inquiry: 'سوال عمومی درباره ثبت‌نام',
    bug_report: 'باگ در صفحه پروفایل',
    feature_request: 'درخواست قابلیت جدید',
    other: 'موضوع دیگر',
  };
  return titles[category] || 'تیکت پشتیبانی';
};

// Generate replies
const generateReplies = (ticketAuthorId, adminId) => {
  const replies = [];
  const numReplies = Math.floor(Math.random() * 4); // 0 to 3 replies
  let lastSender = 'user'; // Start with user

  const senderPool = [
    { id: ticketAuthorId, type: 'user' },
    { id: adminId, type: 'admin' },
  ];

  for (let i = 0; i < numReplies; i++) {
    const isUser = lastSender === 'admin';
    const senderObj = isUser ? senderPool[0] : senderPool[1];
    const createdAt = new Date(randomPastDate(3));

    replies.push({
      message: `${generateMessage('general_inquiry')} (${i + 1})`,
      sender: new mongoose.Types.ObjectId(senderObj.id),
      sender_type: senderObj.type,
      is_read: randomBool(0.8), // 80% read
      createdAt,
      updatedAt: createdAt,
    });

    lastSender = senderObj.type;
  }

  return replies;
};

// Main seed function
const seedTickets = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/yourdbname');

    // Clear existing seeded tickets (safe: only clear if you want)
    await Ticket.deleteMany({}); // Or add a filter like { title: /تیکت/ } if you want to be safe
    // eslint-disable-next-line no-console
    console.log('🗑️  Existing tickets cleared.');

    const categories = [
      'technical_support',
      'course_content',
      'payment_issue',
      'access_problem',
      'general_inquiry',
      'bug_report',
      'feature_request',
      'other',
    ];

    const priorities = ['low', 'medium', 'high', 'urgent'];
    const statuses = ['open', 'in_progress', 'resolved', 'closed'];

    const adminId = USER_IDS[1]; // Assume one user is admin
    const tickets = [];

    for (let i = 0; i < 20; i++) {
      const userId = new mongoose.Types.ObjectId(randomItem(USER_IDS));
      const category = randomItem(categories);
      const priority = randomItem(priorities);
      const status = randomItem(statuses);

      // Decide if program_id should be set
      const hasProgram = randomBool(0.6); // 60% chance
      const program_id = hasProgram ? new mongoose.Types.ObjectId(randomItem(COURSE_IDS)) : undefined;
      const program_type = program_id ? 'course_session' : undefined;

      const title = generateTitle(category);
      const description = generateMessage(category);

      // Generate replies
      const replies = generateReplies(userId, adminId);

      // Determine last reply
      let last_reply_at = new Date();
      let last_reply_by = 'user';
      if (replies.length > 0) {
        const lastReply = replies[replies.length - 1];
        last_reply_at = lastReply.createdAt;
        last_reply_by = lastReply.sender_type;
      } else {
        last_reply_at = randomPastDate(5);
      }

      // Resolved data
      let resolved_at = null;
      let resolved_by = null;
      if (status === 'resolved' || status === 'closed') {
        resolved_at = new Date(last_reply_at);
        resolved_by = new mongoose.Types.ObjectId(adminId);
      }

      // Read status
      const is_read_by_admin = replies.some((r) => r.sender_type === 'user') || status !== 'open';

      // Build ticket object
      const ticket = {
        title,
        description,
        user: userId,
        program_id,
        program_type,
        // course_id: null, // skipped as per note
        status,
        priority,
        category,
        // attachments: [], // optional — skip for now
        replies,
        assigned_to: randomBool(0.7) ? new mongoose.Types.ObjectId(adminId) : null,
        is_read_by_admin,
        is_read_by_user: true,
        last_reply_at,
        last_reply_by,
        resolved_at,
        resolved_by,
        resolution_notes:
          status === 'resolved' || status === 'closed'
            ? `تیکت توسط ادمین حل شد. دلیل: ${description.substring(0, 100)}...`
            : undefined,
        is_deleted: false,
        createdAt: randomPastDate(10),
        updatedAt: new Date(),
      };

      tickets.push(ticket);
    }

    // Insert all tickets
    await Ticket.insertMany(tickets, { ordered: false });
    console.log('✅ Successfully seeded 20 tickets!');

    // Disconnect
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Ticket seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedTickets();
}

module.exports = seedTickets;

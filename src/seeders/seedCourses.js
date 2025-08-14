/* eslint-disable camelcase */
/* eslint-disable no-console */
// seeders/seedCourses.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const server_url = 'http://localhost:9000/v1';

// Import the Course model
const { Course } = require('../domain/Course/course.model'); // Adjust path as needed

// Provided IDs
const USER_IDS = ['67976d05a41ee135e561b809', '679d440c18c8446a24186c36', '68467788186e0cb691a16f83'];

const FILE_IDS = ['684661e28fb728fa3fc0b1ce', '684657117abedc98783f2ab3', '67620e2688dd804ab80f6c1a'];

const COURSE_CATEGORY_IDS = ['6762e39bf0c0512554de0019', '6762e3a3f0c0512554de001b', '68464b39ba0ecc8dd93fb2c1'];

// Helpers
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBool = (chance = 0.5) => Math.random() < chance;

// Random date in the past
const randomCreatedAt = () => {
  const days = Math.floor(Math.random() * 30);
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Generate realistic fake data
const fakeTitles = [
  'آموزش جامع React و Next.js',
  'طراحی وب با Tailwind CSS',
  'برنامه‌نویسی پایتون برای مبتدیان',
  'آموزش هوش مصنوعی و یادگیری ماشین',
  'توسعه فرانت‌اند با TypeScript',
  'آموزش Django و بک‌اند پایتون',
  'آموزش فتوشاپ و طراحی گرافیک',
  'آموزش زبان انگلیسی سطح پیشرفته',
  'مدیریت پروژه با اسکرام',
  'آموزش امنیت سایبری',
];

const fakeSubTitles = [
  'از مبتدی تا حرفه‌ای',
  'آموزش عملی با پروژه واقعی',
  'به زبان ساده و روان',
  'به‌روزترین تکنیک‌ها و ابزارها',
  'آموزش گام به گام',
  'برای توسعه‌دهندگان جوان',
  'شامل گواهی پایان دوره',
  'با پشتیبانی مادام‌العمر',
  'بدون نیاز به پیش‌نیاز',
  'برای شروع کسب‌وکار آنلاین',
];

const fakeDescriptions = [
  'این دوره جامع تمام مباحث مربوط به React و Next.js را پوشش می‌دهد.',
  'در این دوره با اصول طراحی مدرن و responsive design آشنا می‌شوید.',
  'برنامه‌نویسی پایتون را از صفر شروع کنید و به سطح پیشرفته برسید.',
  'با مفاهیم هوش مصنوعی و مدل‌های یادگیری ماشین آشنا شوید.',
  'توسعه فرانت‌اند با TypeScript و ابزارهای مدرن.',
];

// Sample media types
const mediaTypes = ['video', 'audio', 'document'];

// Course languages
const languages = ['fa', 'en'];

// Course types
const courseTypes = ['HOZORI', 'OFFLINE'];

// Generate sample media
const generateSampleMedia = () => {
  const count = randomInt(1, 3); // 1 to 3 sample media
  const media = [];

  for (let i = 0; i < count; i++) {
    const fileId = new mongoose.Types.ObjectId(randomItem(FILE_IDS));
    const type = randomItem(mediaTypes);
    const title = `نمونه محتوا ${i + 1}`;
    const url = `${server_url}/file/${fileId}`;

    media.push({
      media_type: type,
      media_title: title,
      url_address: url,
      file: fileId,
    });
  }

  return media;
};

// Generate course objects based on subject header count
const generateCourseObjects = (subjectCount) => {
  const objects = [];
  for (let i = 0; i < subjectCount; i++) {
    objects.push({
      subject_title: `فصل ${i + 1}: مفاهیم پایه`,
      status: randomBool(0.8) ? 'PUBLIC' : 'PRIVATE',
      duration: randomInt(10, 60), // minutes
      files: new mongoose.Types.ObjectId(randomItem(FILE_IDS)),
    });
  }
  return objects;
};

// Main seed function
const seedCourses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/yourdbname');

    // Clear existing courses (optional: filter if needed)
    // await Course.deleteMany({});
    console.log('🗑️  Existing courses cleared.');

    const courses = [];

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 30; i++) {
      const title = randomItem(fakeTitles);
      const sub_title = randomItem(fakeSubTitles);
      const description = randomItem(fakeDescriptions);
      const description_long = `${description} این دوره شامل ${randomInt(5, 15)} جلسه آموزشی است و طول می‌کشد ${randomInt(
        20,
        40
      )} ساعت.`;

      const subjectHeader = randomInt(3, 8); // 3 to 8 subjects
      const courseDuration = subjectHeader * randomInt(45, 90); // Total duration in minutes

      const priceBase = randomInt(50000, 500000); // 50k to 500k
      const isFireSale = randomBool(0.3);
      const priceDiscount = isFireSale ? priceBase - randomInt(50000, 150000) : undefined;

      const course = {
        title,
        sub_title,
        description,
        description_long,
        tumbnail_image: new mongoose.Types.ObjectId(randomItem(FILE_IDS)),
        sample_media: generateSampleMedia(),
        price_real: priceBase,
        price_discount: priceDiscount || undefined,
        is_fire_sale: isFireSale,
        // member: [], // skipped as per note
        // max_member_accept: 10, // skipped
        course_language: randomItem(languages),
        course_duration: courseDuration,
        course_type: randomBool(0.7) ? randomItem(courseTypes) : undefined,
        course_subject_header: subjectHeader,
        educational_level: randomInt(1, 3),
        is_have_licence: randomBool(0.4),
        course_views: randomInt(100, 5000),
        score: Number((Math.random() * 4 + 1).toFixed(1)), // 1.0 to 5.0
        course_category: [new mongoose.Types.ObjectId(randomItem(COURSE_CATEGORY_IDS))],
        coach_id: new mongoose.Types.ObjectId(randomItem(USER_IDS)),
        course_objects: generateCourseObjects(subjectHeader),
        course_status: randomBool(0.95), // 95% active
        slug: title
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        course_expire: randomBool(0.1), // 10% expired
        createdAt: randomCreatedAt(),
        updatedAt: new Date(),
      };

      courses.push(course);
    }

    // Insert into DB
    await Course.insertMany(courses);
    console.log(`✅ Successfully seeded ${courses.length} courses!`);

    // Disconnect
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Course seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedCourses();
}

module.exports = seedCourses;

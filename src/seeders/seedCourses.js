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
const USER_IDS = ['68526d430cec9186a98c07bb'];

const FILE_IDS = ['68ade90d272517005918c6c0', '68adea69272517005918c6cb', '68adeabf272517005918c6d7'];

const COURSE_CATEGORY_IDS = ['68b16548286466003d9e9d2f', '68b1656a4d2bfb004b05b753', '68b165b64d2bfb004b05b758'];

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
const mediaTypes = ['VIDEO', 'AUDIO', 'DOCUMENT', 'IMAGE'];

// Course languages
const languages = ['fa', 'en'];

// Course types
const courseTypes = ['HOZORI', 'OFFLINE'];


const sampleMedia = [
  {
    media_type: 'IMAGE',
    file: '68ac2dc9b6827b002fdd3260',
  },
  {
    media_type: 'IMAGE',
    file: '68ade4ff07a301002fd14431',
  },
  {
    media_type: 'VIDEO',
    file: '68b162433a6144002f4ad48f',
  },
  {
    media_type: 'VIDEO',
    file: '68b162433a6144002f4ad48f',
  },
  {
    media_type: 'VIDEO',
    file: '68b162433a6144002f4ad48f',
  },
  {
    media_type: 'DOCUMENT',
    file: '68b1628b93c609003d28d70c',
  },
  {
    media_type: 'DOCUMENT',
    file: '68b1628b93c609003d28d70c',
  },
  {
    media_type: 'AUDIO',
    file: '68b162eb93c609003d28d70e',
  },

];

// Generate sample media
const generateSampleMedia = () => {
  const count = randomInt(1, 3); // 1 to 3 sample media
  const media = [];

  for (let i = 0; i < count; i++) {
    const _sampleMedia = randomItem(sampleMedia);
    const fileId = new mongoose.Types.ObjectId(_sampleMedia.file);
    const type = _sampleMedia.media_type;
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
      description: 'این فصل شامل مفاهیم پایه و آموزش های مرتبط با آن است.',
      order: i + 1,
      status: randomBool(0.8) ? 'PUBLIC' : 'PRIVATE',
      duration: randomInt(10, 60), // minutes
      files: new mongoose.Types.ObjectId('68b162433a6144002f4ad48f'), // video
      lessons: [
        {
          title: 'درس 1: مفاهیم پایه',
          description: 'این درس شامل مفاهیم پایه و آموزش های مرتبط با آن است.',
          order: 1,
          status: randomBool(0.8) ? 'PUBLIC' : 'PRIVATE',
          duration: randomInt(10, 60), // minutes
          file: new mongoose.Types.ObjectId('68b162433a6144002f4ad48f'), // video
        },
        {
          title: 'درس 1: مفاهیم پایه',
          description: 'این درس شامل مفاهیم پایه و آموزش های مرتبط با آن است.',
          order: 1,
          status: randomBool(0.8) ? 'PUBLIC' : 'PRIVATE',
          duration: randomInt(10, 60), // minutes
          file: new mongoose.Types.ObjectId('68b162433a6144002f4ad48f'), // video
        },
      ],
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
    await Course.deleteMany({});
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

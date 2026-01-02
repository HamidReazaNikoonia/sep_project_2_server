// seeders/seedProducts.js

const mongoose = require('mongoose');
// const { SERVER_API_URL } = require('../config/config');
// const dotenv = require('dotenv');


// const server_url = `${SERVER_API_URL}/v1`;

// Load environment variables
// dotenv.config();

// Import models
const { Product, ProductReview, Collection } = require('../domain/shop/Product/product.model'); // Adjust path
const Category = require('../domain/shop/Product/Category/category.model'); // Adjust path

require('../services/uploader/uploader.model');

// Provided Image Upload IDs
const ImageUploadIds = [
  '69570a5479acf7002f119192',
  '69570a7679acf7002f119194',
  '69570a98271a53003d6fa72a',
  '69570ab6271a53003d6fa72c',
  '69570ac5271a53003d6fa72e',
];

// Helper functions
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomBool = (chance = 0.5) => Math.random() < chance;

const randomCreatedAt = () => {
  const days = Math.floor(Math.random() * 30);
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Fake data
const titles = [
  'گوشی هوشمند پرچم‌دار X200',
  'هدفون بلوتوثی با کاهش نویز',
  'ساعت هوشمند فیتنس',
  'لپ‌تاپ اولترابک 14 اینچی',
  'دوربین دیجیتال حرفه‌ای',
  'ماوس بی‌سیم مدل جدید',
  'صفحه کلید مکانیکال',
  'اسپیکر بی‌سیم قدرتمند',
  'پاوربانک 20000mAh',
  'کیف و کاور چرمی',
];

const subtitles = [
  'با بهترین عملکرد و طراحی زیبا',
  'مناسب برای کار و تفریح',
  'فناوری روز دنیا',
  'باتری طولانی‌مدت و سرعت بالا',
  'طراحی ارگونومیک و راحت',
];

const descriptions = [
  'این محصول با استفاده از جدیدترین فناوری‌ها طراحی شده و عملکرد عالی در شرایط مختلف دارد.',
  'سبک، قدرتمند و با ظاهری شیک — انتخاب ایده‌آل برای کاربران حرفه‌ای.',
  'قابلیت‌های پیشرفته، کیفیت ساخت عالی و پشتیبانی طولانی‌مدت.',
];

const brands = ['TechPro', 'SoundMax', 'UltraGear', 'Nova', 'Prime', 'EcoTech', 'SmartLife'];

const materials = ['پلاستیک مقاوم', 'فولاد ضدزنگ', 'چرم مصنوعی', 'آلومینیوم', 'سیلیکون'];
const countries = ['IR', 'CN', 'US', 'DE', 'JP'];

// Status enum
const productTypesEnum = ['publish', 'draft', 'rejected'];

// 🌟 Step 1: Seed Categories (with hierarchy)
const seedCategories = async () => {
  const categoryNames = [
    'الکترونیک',
    'موبایل',
    'لپ‌تاپ',
    'صوتی و تصویری',
    'لوازم جانبی',
    'سبک زندگی',
    'هوش مصنوعی',
    'ورزش و تناسب اندام',
    'تحفه و هدیه',
    'خانه هوشمند',
  ];

  const categories = [];

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const level = randomBool(0.3) ? 1 : 0; // 30% are subcategories
    const parent = level === 1 ? randomItem(categories.filter(c => c.level === 0)) : null;

    const category = await Category.create({
      name,
      parent: parent?._id,
      level,
      isActive: true,
      createdAt: randomCreatedAt(),
      updatedAt: new Date(),
    });

    // Add path and path_name
    // category.path = parent ? `${parent.path}.${category._id}` : category._id.toString();
    // category.path_name = parent ? `${parent.path_name} > ${name}` : name;
    await category.save();

    categories.push(category);
  }

  console.log(`✅ Created ${categories.length} categories`);
  return categories;
};

// 🌟 Step 2: Seed Products
const seedProducts = async (categories) => {
  const products = [];

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 30; i++) {
    const title = randomItem(titles);
    const subtitle = randomItem(subtitles);
    const description = randomItem(descriptions);

    const price = randomInt(50000, 2000000); // 50k to 2M
    const isFireSale = randomBool(0.5);
    const discountable = isFireSale
      ? {
          status: true,
          percent: randomInt(5, 30)
        }
      : { status: false };

    const finalPriceWithDiscount = isFireSale ? Math.ceil(price * (1 - discountable.percent / 100)) : price;

    const product = {
      title,
      subtitle,
      meta_title: `${title} | فروشگاه ما`,
      meta_description: description.substring(0, 150),
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
        .replace(/^-+|-+$/g, ''),
      description,
      images: Array.from(
        { length: randomInt(1, 3) },
        () => new mongoose.Types.ObjectId(randomItem(ImageUploadIds))
      ),
      thumbnail: new mongoose.Types.ObjectId(randomItem(ImageUploadIds)),
      brand: randomItem(brands),
      product_category: Array.from(
        { length: randomInt(1, 3) },
        () => randomItem(categories)._id
      ),
      average_rating: Number((Math.random() * 4 + 1).toFixed(1)), // 1.0 to 5.0
      price_real: price,
      // Randomly assign price_discount as 0 in about half of the products
      price_discount: isFireSale ? finalPriceWithDiscount : 0,
      is_fire_sale: isFireSale,
      countInStock: randomInt(0, 50),
      is_available: randomInt(0, 50) > 0,
      is_giftcard: false,
      status: randomItem(productTypesEnum),
      qr_code: `QR-${Date.now()}-${i}`,
      product_details: {
        variants: `Color: ${['Black', 'White', 'Red'][Math.floor(Math.random() * 3)]}`,
        width: randomInt(5, 30),
        height: randomInt(5, 30),
        length: randomInt(10, 50),
        origin_country: randomItem(countries),
        material: randomItem(materials)
      },
      tag: [
        { name: 'پرفروش' },
        { name: randomBool() ? 'جدید' : 'تخفیف‌دار' }
      ],
      discountable,
      publish_on_website: true,
      publish_on_social: {
        instagram: {
          publish: randomBool(0.6),
          post_id: randomBool(0.6) ? `insta_${randomInt(1000, 9999)}` : undefined,
          post_url: randomBool(0.6) ? `https://instagram.com/p/${randomInt(1000, 9999)}` : undefined
        }
      },
      createdAt: randomCreatedAt(),
      updatedAt: new Date()
    };

    products.push(product);
  }

  const createdProducts = await Product.insertMany(products, { ordered: false });
  console.log(`✅ Created ${createdProducts.length} products`);

  return createdProducts;
};

// 🌟 Step 3: Seed Reviews
const seedReviews = async (products, userIds = null) => {
  const reviewerNames = ['علی رضا', 'سارا محمدی', 'محمد حسینی', 'نگین احمدی', 'کیان خسروی'];
  const comments = [
    'کیفیت عالی و تحویل سریع.',
    'محصول دقیقاً مطابق توضیحات بود.',
    'کمی گران بود ولی ارزششو داشت.',
    'بسته‌بندی خوبی داشت.',
    'پشتیبانی عالی، ممنون!'
  ];

  const reviews = [];

  for (const product of products) {
    const numReviews = randomInt(1, 5);
    for (let j = 0; j < numReviews; j++) {
      const review = {
        product: product._id,
        name: randomItem(reviewerNames),
        rating: randomInt(3, 5),
        comment: randomItem(comments),
        user: randomBool(0.6) ? new mongoose.Types.ObjectId(randomItem(userIds || [])) : undefined,
        status: true,
        createdAt: randomCreatedAt(),
        updatedAt: new Date()
      };
      reviews.push(review);
    }
  }

  if (reviews.length > 0) {
    await ProductReview.insertMany(reviews);
    console.log(`✅ Created ${reviews.length} reviews`);
  }

  // Update product average ratings
  for (const product of products) {
    const reviewsForProduct = reviews.filter(r => r.product.equals(product._id));
    if (reviewsForProduct.length > 0) {
      const avg = reviewsForProduct.reduce((sum, r) => sum + r.rating, 0) / reviewsForProduct.length;
      await Product.findByIdAndUpdate(product._id, { average_rating: Number(avg.toFixed(1)) });
    }
  }
};

// 🌟 Step 4: Seed Collections
const seedCollections = async (products) => {
  const collectionNames = [
    'پرفروش‌های هفته',
    'تخفیف‌های ویژه',
    'محصولات جدید',
    'انتخاب سردبیر',
    'هدیه‌های مناسب'
  ];

  const collections = [];

  for (const name of collectionNames) {
    const numProducts = randomInt(3, 8);
    const selectedProducts = Array.from(
      { length: numProducts },
      () => randomItem(products)._id
    );

    const collection = {
      name,
      description: `مجموعه‌ای از بهترین محصولات: ${name}`,
      status: true,
      product: selectedProducts,
      createdAt: randomCreatedAt(),
      updatedAt: new Date()
    };

    collections.push(collection);
  }

  await Collection.insertMany(collections);
  console.log(`✅ Created ${collections.length} collections`);
};

// 🌟 Main Seeder Function
const seedProductsAndRelated = async () => {
  try {
    // Connect to DB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/yourdbname');

    // Clear existing data
    await Promise.all([
      Product.deleteMany({}),
      ProductReview.deleteMany({}),
      Collection.deleteMany({}),
      Category.deleteMany({})
    ]);
    console.log('🗑️  Existing data cleared.');

    // Step 1: Seed categories
    const categories = await seedCategories();

    // Step 2: Seed products
    const products = await seedProducts(categories);

    // Optional: User IDs for reviews (if you have users)
    const USER_IDS = [
      '67976d05a41ee135e561b809',
      '679d440c18c8446a24186c36',
      '68467788186e0cb691a16f83'
    ].map(id => new mongoose.Types.ObjectId(id));

    // Step 3: Seed reviews
    await seedReviews(products, USER_IDS);

    // Step 4: Seed collections
    await seedCollections(products);

    console.log('🎉 All product-related data seeded successfully!');

    // Disconnect
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedProductsAndRelated();
}

module.exports = seedProductsAndRelated;

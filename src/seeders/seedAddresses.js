// seeders/seedAddresses.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import the Address model
const { Address } = require('../domain/shop/Order/order.model'); // Adjust path as needed

// Provided User IDs for `customer`
const USER_IDS = [
  '690e8004164f9b002fa09a00',
  '68feb4255b2512002f78f2f0',
  '68cecf16e2bef7004b0dabc3'
];

// Helper functions
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

// Iranian cities and states data
const iranianStates = [
  { id: 1, name: 'تهران' },
  { id: 2, name: 'اصفهان' },
  { id: 3, name: 'شیراز' },
  { id: 4, name: 'تبریز' },
  { id: 5, name: 'مشهد' },
  { id: 6, name: 'اهواز' },
  { id: 7, name: 'کرج' },
  { id: 8, name: 'قم' },
  { id: 9, name: 'کرمان' },
  { id: 10, name: 'رشت' }
];

const iranianCities = [
  { id: 1, name: 'تهران', stateId: 1 },
  { id: 2, name: 'ورامین', stateId: 1 },
  { id: 3, name: 'دماوند', stateId: 1 },
  { id: 4, name: 'اصفهان', stateId: 2 },
  { id: 5, name: 'کاشان', stateId: 2 },
  { id: 6, name: 'نائین', stateId: 2 },
  { id: 7, name: 'شیراز', stateId: 3 },
  { id: 8, name: 'مرودشت', stateId: 3 },
  { id: 9, name: 'کازرون', stateId: 3 },
  { id: 10, name: 'تبریز', stateId: 4 },
  { id: 11, name: 'مرند', stateId: 4 },
  { id: 12, name: 'میانه', stateId: 4 },
  { id: 13, name: 'مشهد', stateId: 5 },
  { id: 14, name: 'نیشابور', stateId: 5 },
  { id: 15, name: 'سبزوار', stateId: 5 },
  { id: 16, name: 'اهواز', stateId: 6 },
  { id: 17, name: 'آبادان', stateId: 6 },
  { id: 18, name: 'خرمشهر', stateId: 6 },
  { id: 19, name: 'کرج', stateId: 7 },
  { id: 20, name: 'ساوجبلاغ', stateId: 7 },
  { id: 21, name: 'گلستان', stateId: 7 },
  { id: 22, name: 'قم', stateId: 8 },
  { id: 23, name: 'کرمان', stateId: 9 },
  { id: 24, name: 'راور', stateId: 9 },
  { id: 25, name: 'بم', stateId: 9 },
  { id: 26, name: 'رشت', stateId: 10 }
];

// Generate realistic Iranian postal codes
const generatePostalCode = () => {
  return `${randomInt(10000, 99999)}${randomInt(10000, 99999)}`;
};

// Generate realistic address lines
const generateAddressLine1 = (cityName) => {
  const streets = [
    'خیابان ولیعصر',
    'خیابان تجریش',
    'خیابان کریمخان',
    'خیابان فاطمی',
    'خیابان ولنجک',
    'خیابان شریعتی',
    'خیابان میرداماد',
    'خیابان گاندی',
    'خیابان بهشتی',
    'خیابان مطهری'
  ];

  const numbers = [
    `${randomInt(1, 999)}`,
    `${randomInt(1, 999)} - ${randomInt(10, 99)} پلاک`,
    `واحد ${randomInt(1, 20)}`,
    `بلوک ${String.fromCharCode(65 + randomInt(0, 25))}`
  ];

  return `${randomItem(streets)}, ${randomItem(numbers)}, ${cityName}`;
};

const addressTitles = [
  'آدرس منزل',
  'آدرس محل کار',
  'آدرس پدر',
  'آدرس مادر',
  'آدرس دفتر کار',
  'آدرس پروژه',
  'آدرس دانشگاه',
  'آدرس بسته‌گیری',
  'آدرس تحویل',
  'آدرس اضطراری'
];

// Main seed function
const seedAddresses = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/yourdbname');

    // Clear existing addresses
    await Address.deleteMany({});
    console.log('🗑️  Existing addresses cleared.');

    const addresses = [];

    for (let i = 0; i < 25; i++) { // Creating 25 sample addresses
      const userId = new mongoose.Types.ObjectId(randomItem(USER_IDS));

      // Select a random state
      const state = randomItem(iranianStates);

      // Get cities that belong to this state
      const stateCities = iranianCities.filter(city => city.stateId === state.id);
      const city = stateCities.length > 0 ? randomItem(stateCities) : iranianCities[0];

      // Generate address components
      const addressLine1 = generateAddressLine1(city.name);
      const hasAddressLine2 = randomBool(0.3); // 30% have address line 2
      const addressLine2 = hasAddressLine2
        ? `واحد ${randomInt(1, 20)}, طبقه ${randomInt(1, 10)}`
        : undefined;

      const address = {
        customer: userId,
        billingAddress: {
          addressLine1,
          addressLine2: addressLine2 || undefined,
          city: city.id,
          state: state.id,
          postalCode: generatePostalCode(),
          country: 'IRAN',
          title: randomItem(addressTitles)
        },
        createdAt: randomCreatedAt(),
        updatedAt: new Date()
      };

      addresses.push(address);
    }

    // Insert all addresses
    await Address.insertMany(addresses, { ordered: false });
    console.log(`✅ Successfully seeded ${addresses.length} addresses!`);

    // Disconnect
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Address seeding failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedAddresses();
}

module.exports = seedAddresses;

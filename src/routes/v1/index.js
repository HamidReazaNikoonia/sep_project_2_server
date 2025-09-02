const express = require('express');
const authRoute = require('./auth.route');
const userRoute = require('./user.route');
const docsRoute = require('./docs.route');
const config = require('../../config/config');

const referenceRoute = require('../../domain/Reference/reference.route');
const transactionRoute = require('../../domain/Transaction/transaction.route');
const consultRoute = require('../../domain/Consult/consult.route');
const courseRoute = require('../../domain/Course/course.route');
const coachRoute = require('../../domain/Coach/coach.route');
const profileRoute = require('../../domain/Profile/profile.route');
const courseSessionRoute = require('../../domain/Course_Session/courseSession.route');
const {
  adminRouter: productAdminRoute,
  publicRouter: productPublicRoute,
} = require('../../domain/shop/Product/product.route');

const cartRouter = require('../../domain/shop/Cart/cart.route');

const { orderRoute, orderRouteForAdmin } = require('../../domain/shop/Order/order.route');

// Admin Routes
const timeSlotRoute = require('../../domain/TimeSlot/time_slot.route');
const uploaderRoute = require('../../services/uploader/uploader.controller');

// Class No Routes
const ClassNoRoutes = require('../../domain/ClassNo/classNo.routes');

// admin setting
const { adminSettingRoutes } = require('../../domain/Admin/admin_setting.route');

// Search
const searchRoute = require('../../domain/Search/search.route');

// Coupon Code
const couponCodeRoute = require('../../domain/CouponCodes/couponCodes.route');

// Site Info
const siteInfoRoutes = require('../../domain/SiteInfo/siteInfo.route');

// Notification Routes
const notificationRoute = require('../../domain/Notification/notification.route');

// Tickets Routes
const ticketRoute = require('../../domain/Ticket/ticket.route');

// Blog Routes
const blogRoute = require('../../domain/Blog/blog.route');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/users',
    route: userRoute,
  },
  {
    path: '/consult',
    route: consultRoute,
  },
  {
    path: '/reference',
    route: referenceRoute,
  },
  {
    path: '/transaction',
    route: transactionRoute,
  },
  {
    path: '/product',
    route: productPublicRoute,
  },
  {
    path: '/order',
    route: orderRoute,
  },
  {
    path: '/cart',
    route: cartRouter,
  },
  {
    path: '/course',
    route: courseRoute,
  },
  {
    path: '/course-session',
    route: courseSessionRoute,
  },
  {
    path: '/coach',
    route: coachRoute,
  },
  {
    path: '/profile',
    route: profileRoute,
  },
  {
    path: '/search',
    route: searchRoute,
  },
  {
    path: '/admin/order',
    route: orderRouteForAdmin,
  },
  {
    path: '/admin/product',
    route: productAdminRoute,
  },
  {
    path: '/admin/time-slot',
    route: timeSlotRoute,
  },
  {
    path: '/admin/coupon-code',
    route: couponCodeRoute,
  },
  {
    path: '/admin/class-no',
    route: ClassNoRoutes,
  },
  {
    path: '/admin/setting/upload',
    route: uploaderRoute,
  },
  {
    path: '/admin/setting/set',
    route: adminSettingRoutes,
  },
  {
    path: '/site-info',
    route: siteInfoRoutes,
  },
  {
    path: '/notification',
    route: notificationRoute,
  },
  {
    path: '/blog',
    route: blogRoute,
  },
  {
    path: '/ticket',
    route: ticketRoute,
  },
];

const devRoutes = [
  // routes available only in development mode
  {
    path: '/docs',
    route: docsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

/* istanbul ignore next */
if (config.env === 'development') {
  devRoutes.forEach((route) => {
    router.use(route.path, route.route);
  });
}

module.exports = router;

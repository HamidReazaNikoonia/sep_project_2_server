const express = require('express');

const router = express.Router();
const { getAllCities, getCitiesByProvince, getProvince } = require('./siteInfo.controller');

// Public routes
router.get('/provinces', getProvince);
router.get('/cities', getAllCities);
router.get('/provinces/:provinceId/cities', getCitiesByProvince);

module.exports = router;

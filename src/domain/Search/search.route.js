const express = require('express');

const searchController = require('./search.controller');


const router = express.Router();


router
  .route('/')
  .get(searchController.generalSearch)


module.exports = router;

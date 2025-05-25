const httpStatus = require('http-status');


// Models
const { Course } = require('../Course/course.model');
const { Product } = require('../shop/Product/product.model');


/**
* Search for Product & Courses
* @param {Query} keyword - Mongo filter
* @returns {Promise<QueryResult>}
    */

const generalSearch = async ({ query }) => {

  const {q, page = 1, limit = 5} = query

  const searchFilter = { $text: { $search: q } };
  // const projection = { title: 1, sub_title: 1, score: { $meta: 'textScore' } };
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);


  const [products, courses] = await Promise.all([
    Product.find(searchFilter)
      .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean(),

    Course.find(searchFilter)
      .sort({ score: { $meta: 'textScore' } }) // Sort by relevance
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean()
  ]);

  // Combine results & add type field
  return {
    data: [
      ...products.map(item => ({ ...item, type: 'Product' })),
      ...courses.map(item => ({ ...item, type: 'Course' }))
    ]
  }

};


module.exports = {
  generalSearch
};

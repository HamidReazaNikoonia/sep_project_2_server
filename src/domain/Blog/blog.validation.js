const Joi = require('joi');
const { objectId } = require('../../validations/custom.validation');

const createBlog = {
  body: Joi.object().keys({
    title: Joi.string().required().max(255),
    sub_title: Joi.string().max(500),
    content: Joi.string().required(),
    thumbnail: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  }),
};

const getBlogList = {
  query: Joi.object().keys({
    q: Joi.string(),
    search: Joi.string(),
    tags: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())),
    created_from_date: Joi.date(),
    created_to_date: Joi.date(),
    author: Joi.string().custom(objectId),
    _id: Joi.string().custom(objectId),
    page: Joi.number().min(1),
    limit: Joi.number().min(1).max(100),
    sortBy: Joi.string(),
    sortOrder: Joi.string().valid('asc', 'desc'),
  }),
};

const getBlogById = {
  params: Joi.object().keys({
    blogId: Joi.string().custom(objectId),
  }),
};

const updateBlog = {
  params: Joi.object().keys({
    blogId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string().max(255),
      sub_title: Joi.string().max(500),
      content: Joi.string(),
      thumbnail: Joi.string(),
      tags: Joi.array().items(Joi.string()),
    })
    .min(1),
};

const deleteBlog = {
  params: Joi.object().keys({
    blogId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  createBlog,
  getBlogList,
  getBlogById,
  updateBlog,
  deleteBlog,
};

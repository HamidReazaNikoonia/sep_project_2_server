const Joi = require('joi');
const { objectId } = require('../../validations/custom.validation');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
  }),
};

const createSubCategory = {
  body: Joi.object().keys({
    name: Joi.string().trim().required(),
  }),
  params: Joi.object().keys({
    categoryId: Joi.string().hex().length(24).required(),
  }),
};

const createCourse = {
  body: Joi.object().keys({
    title: Joi.string().trim().required().min(3).max(100),
    sub_title: Joi.string().trim().required().min(3).max(100),
    description: Joi.string().required().min(10).max(2000),
    tumbnail: Joi.string().custom(objectId).required(),
    price: Joi.number().required().min(10000),
    max_member_accept: Joi.number().required().min(1),
    course_language: Joi.string(),
    course_duration: Joi.number(),
    educational_level: Joi.string(),
    is_have_licence: Joi.boolean(),
    course_session_category: Joi.string().custom(objectId),
    course_session_sub_category: Joi.string().custom(objectId),
    course_type: Joi.string().valid('ONLINE', 'HOZORI').required(),
    coaches: Joi.array().items(Joi.string().custom(objectId).required()).min(1).required(),
    sessions: Joi.array()
      .items(
        Joi.object().keys({
          coach: Joi.string().custom(objectId).required(),
          date: Joi.date().greater('now').required(),
          startTime: Joi.string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          endTime: Joi.string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          meetingLink: Joi.string(),
          location: Joi.string(),
        })
      )
      .min(1)
      .required(),
    // ... other fields
  }),
};

const updateCourse = {
  params: Joi.object().keys({
    courseId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      title: Joi.string().trim().min(3).max(100),
      description: Joi.string().min(10).max(2000),
      courseType: Joi.string().valid('online', 'in-person'),
      coaches: Joi.array().items(Joi.string().custom(objectId)).min(1),
      sessions: Joi.array()
        .items(
          Joi.object().keys({
            _id: Joi.string().custom(objectId).optional(),
            coach: Joi.string().custom(objectId),
            date: Joi.date().greater('now'),
            startTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            endTime: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
            meetingLink: Joi.string().uri().when('courseType', {
              is: 'online',
              then: Joi.required(),
              otherwise: Joi.forbidden(),
            }),
            location: Joi.string().when('courseType', {
              is: 'in-person',
              then: Joi.required(),
              otherwise: Joi.forbidden(),
            }),
            status: Joi.string().valid('scheduled', 'completed', 'cancelled'),
          })
        )
        .min(1),
      // ... other fields
    })
    .min(1),
};

module.exports = {
  courseCategoryValidation: {
    createCategory,
    createSubCategory,
    createCourse,
    updateCourse,
  },
};

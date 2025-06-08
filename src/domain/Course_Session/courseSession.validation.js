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
    description_long: Joi.string().min(10).max(2000),
    tumbnail: Joi.string().custom(objectId),
    // price: Joi.number().required().min(10000),
    sample_media: Joi.array()
      .items(
        Joi.object().keys({
          media_type: Joi.string().required(),
          media_title: Joi.string().required(),
          url_address: Joi.string().uri().allow(''),
          file: Joi.string().custom(objectId).required(),
        })
      )
      .optional(),
    // max_member_accept: Joi.number().required().min(1),
    course_language: Joi.string(),
    // course_duration: Joi.number(),
    educational_level: Joi.number(),
    // is_have_licence: Joi.boolean(),
    course_session_category: Joi.array().items(Joi.string().custom(objectId)),
    // course_session_sub_category: Joi.string().custom(objectId),
    // course_type: Joi.string().valid('ONLINE', 'HOZORI').required(),
    // coaches: Joi.array().items(Joi.string().custom(objectId).required()).min(1).required(),
    // sessions: Joi.array()
    //   .items(
    //     Joi.object().keys({
    //       coach: Joi.string().custom(objectId).required(),
    //       date: Joi.date().greater('now').required(),
    //       startTime: Joi.string()
    //         .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    //         .required(),
    //       endTime: Joi.string()
    //         .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    //         .required(),
    //       meetingLink: Joi.string(),
    //       location: Joi.string(),
    //     })
    //   )
    //   .min(1)
    //   .required(),
    // classes: Joi.array()
    //   .items(
    //     Joi.object().keys({
    //       coach: Joi.string().custom(objectId).required(),
    //       classNo: Joi.string().custom(objectId).required(),
    //       max_member_accept: Joi.number().integer().min(1).default(10),
    //       member: Joi.array()
    //         .items(
    //           Joi.object().keys({
    //             user: Joi.string().custom(objectId),
    //           })
    //         )
    //         .default([]),
    //       sessions: Joi.array()
    //         .items(
    //           Joi.object().keys({
    //             date: Joi.date().greater('now').required(),
    //             startTime: Joi.string()
    //               .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    //               .required(),
    //             endTime: Joi.string()
    //               .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    //               .required(),
    //             meetingLink: Joi.string().when('course_type', {
    //               is: 'ONLINE',
    //               then: Joi.string().uri().required(),
    //               otherwise: Joi.forbidden(),
    //             }),
    //             location: Joi.string().when('course_type', {
    //               is: 'HOZORI',
    //               then: Joi.string().required(),
    //               otherwise: Joi.forbidden(),
    //             }),
    //             status: Joi.string().valid('scheduled', 'completed', 'cancelled').default('scheduled'),
    //           })
    //         )
    //         .min(1)
    //         .required(),
    //     })
    //   )
    //   .min(1)
    //   .required(),
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
      description_long: Joi.string().min(10).max(2000),
      courseType: Joi.string().valid('online', 'in-person'),
      coaches: Joi.array().items(Joi.string().custom(objectId)).min(1),
      sample_media: Joi.array()
        .items(
          Joi.object().keys({
            media_type: Joi.string().required(),
            media_title: Joi.string().required(),
            url_address: Joi.string().uri().allow(''),
            file: Joi.string().custom(objectId).required(),
          })
        )
        .optional(),
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

const createClassProgram = {
  body: Joi.object().keys({
    coach_id: Joi.string().custom(objectId).required(),
    class_id: Joi.string().required(),
    program_type: Joi.string().valid('online', 'ON-SITE').required(),
    max_member_accept: Joi.number().integer().min(1).default(10),
    sessions: Joi.array()
      .items(
        Joi.object().keys({
          date: Joi.string()
            .regex(/^\d{4}\/\d{1,2}\/\d{1,2}$/)
            .required(),
          startTime: Joi.string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
          endTime: Joi.string()
            .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
            .required(),
        })
      )
      .min(1)
      .required(),
  }),
};

module.exports = {
  courseCategoryValidation: {
    createCategory,
    createSubCategory,
    createCourse,
    updateCourse,
    createClassProgram,
  },
};

const Joi = require('joi');

const createCoachCourseProgram = {
  body: Joi.object().keys({
    title: Joi.string().trim().required(),
    description: Joi.string().trim().required(),
    amount: Joi.number().required().min(0),
    is_have_penalty: Joi.boolean().default(false),
    penalty_fee: Joi.when('is_have_penalty', {
      is: true,
      then: Joi.number().min(0).required(),
      otherwise: Joi.number().min(0).default(0),
    }),
    course_subject_count: Joi.number().integer().min(0),
    course_object: Joi.array()
      .items(
        Joi.object().keys({
          title: Joi.string().trim().required(),
          description: Joi.string().trim().required(),
          video_file: Joi.string().hex().length(24).required(),
          order: Joi.number().integer().min(0),
          exam: Joi.array()
            .items(
              Joi.object().keys({
                question_title: Joi.string().trim().required(),
                options: Joi.array()
                  .items(
                    Joi.object().keys({
                      text: Joi.string().required(),
                      isCorrect: Joi.boolean().required(),
                    })
                  )
                  .min(2)
                  .required(), // At least 2 options required
                points: Joi.number().integer().min(1).default(1),
              })
            )
            .default([]),
        })
      )
      .required(),
    isPublished: Joi.boolean().default(false),
  }),
};

const updateCoachCourseProgram = {
  body: Joi.object().keys({
    title: Joi.string().trim(),
    description: Joi.string().trim(),
    amount: Joi.number().min(0),
    is_have_penalty: Joi.boolean(),
    penalty_fee: Joi.number().min(0),
    course_subject_count: Joi.number().integer().min(0),
    course_object: Joi.array().items(
      Joi.object().keys({
        title: Joi.string().trim(),
        description: Joi.string().trim(),
        video_file: Joi.string().hex().length(24),
        order: Joi.number().integer().min(0),
        exam: Joi.array().items(
          Joi.object().keys({
            question_title: Joi.string().trim(),
            options: Joi.array()
              .items(
                Joi.object().keys({
                  text: Joi.string(),
                  isCorrect: Joi.boolean(),
                })
              )
              .min(2),
            points: Joi.number().integer().min(1),
          })
        ),
      })
    ),
    isPublished: Joi.boolean(),
  }),
  params: Joi.object().keys({
    programId: Joi.string().hex().length(24).required(),
  }),
};

const getCoachCourseProgram = {
  params: Joi.object().keys({
    programId: Joi.string().hex().length(24).required(),
  }),
};

const deleteCoachCourseProgram = {
  params: Joi.object().keys({
    programId: Joi.string().hex().length(24).required(),
  }),
};

module.exports = {
  createCoachCourseProgram,
  updateCoachCourseProgram,
  getCoachCourseProgram,
  deleteCoachCourseProgram,
};

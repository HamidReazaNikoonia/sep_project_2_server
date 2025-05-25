const Joi = require('joi');

const completeCoachInfo = {
  body: Joi.object().keys({
    father_name: Joi.string().required(),
    national_code: Joi.string()
      .pattern(/^[0-9]{10}$/)
      .required()
      .messages({
        'string.pattern.base': 'National code must be a valid 10-digit Iranian national code',
      }),
    birth_date: Joi.string()
      .pattern(/^[1-4]\d{3}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/)
      .required()
      .messages({
        'string.pattern.base': 'Birth date must be in Shamsi format (YYYY/MM/DD)',
      }),
    city: Joi.number().required(),
    state: Joi.number().required(),
    description: Joi.string().allow(''),
    group_name: Joi.string().allow(''),
  }),
};

module.exports = {
  completeCoachInfo,
};

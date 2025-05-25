const Joi = require('joi');
const { objectId } = require('../../validations/custom.validation');

const referenceTypeEnum = ['HOZORI', 'ONLINE', 'BY_TELEPHONE'];
const consultReasonFromUser = ["EZDEVAJ", "PISH_AZ_BARDARI"];

const createReference = {
  body: Joi.object().keys({
    description: Joi.string().min(30).max(900),
    is_giftcard: Joi.boolean(),
    gifcard_code: Joi.number(),
    ref_type: Joi.string(),
    // customer: Joi.string().custom(objectId).required(),
    consultId: Joi.string().custom(objectId).required(),
    consultant_dr_id: Joi.string().custom(objectId),
  }),
};

const getSpecificReference = {
  params: Joi.object().keys({
    reference_id: Joi.string().custom(objectId),
  }),
};

const implementSession = {
  params: Joi.object().keys({
    reference_id: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    ref_type: Joi.string().valid(...referenceTypeEnum).required(),
    consult_reason: Joi.string().valid(...consultReasonFromUser).required(),
    time_slot_id: Joi.string().custom(objectId),
  }),
};

// const getUsers = {
//   query: Joi.object().keys({
//     name: Joi.string(),
//     role: Joi.string(),
//     sortBy: Joi.string(),
//     limit: Joi.number().integer(),
//     page: Joi.number().integer(),
//   }),
// };

// const getSpecificReference = {
//   params: Joi.object().keys({
//     userId: Joi.string().custom(objectId),
//   }),
// };

// const updateUser = {
//   params: Joi.object().keys({
//     userId: Joi.required().custom(objectId),
//   }),
//   body: Joi.object()
//     .keys({
//       email: Joi.string().email(),
//       password: Joi.string().custom(password),
//       name: Joi.string(),
//     })
//     .min(1),
// };

// const deleteUser = {
//   params: Joi.object().keys({
//     userId: Joi.string().custom(objectId),
//   }),
// };

module.exports = {
  createReference,
  implementSession,
  getSpecificReference,
};

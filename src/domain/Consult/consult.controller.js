const httpStatus = require('http-status');

// const ApiError = require('../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const consultService = require('./consult.service');
const { userService } = require('../../services/index');
// const { createReference } = require('../Reference/reference.service');
const ApiError = require('../../utils/ApiError');

// Enum Constant
const ListOfIssues = [' کوتاهی قد', ' بیماری قلبی']; // Enum

const ResultReason = ['RelationShip', 'Have_Issues'];

const ListOfCheckBoxTemplate = [
  {
    id: 1,
    title: 'خودتان',
    value: false,
  },
  {
    id: 2,
    title: 'فرزندان',
    value: false,
  },
  {
    id: 3,
    title: "خواهر یا برادر",
    value: false,
  },
  {
    id: 4,
    title: "خواهر زاده های پسر خانوم",
    value: false,
  },
  {
    id: 5,
    title: "دایی خانوم",
    value: false,
  },
  {
    id: 6,
    title: "پسر خاله خانوم",
    value: false,
  },
  {
    id: 7,
    title: "پدر بزرگ مادری خانوم",
    value: false,
  },
  {
    id: 8,
    title: "پدر و مادر زوجین",
    value: false,
  },
];

// const create = catchAsync(async (req, res) => {
//   const { user_id } = req.body;

//   const requestBody = {
//     user_id: user_id,
//     report: {
//       ListOfIssues: ListOfIssues,
//       ListOfCheckBox: ListOfCheckBox,
//     },
//     // user,
//   };

//   const newConsult = await consultService.createConsult({ body: requestBody });
//   res.status(httpStatus.CREATED).send(newConsult);
// });

const create = catchAsync(async (req, res) => {
  const { ListOfCheckBox, parent_mariage_type, mariage_type, age, gender, first_name, last_name } = req.body;


  if (!req.user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'User Not Exist');
  }

  const ListOfCheckBoxArray = ListOfCheckBoxTemplate.map((v) => {
    return {
      id: v.id,
      title: v.title,
      value: ListOfCheckBox[v.id]
    }
  })

  const requestBodyForConsult = {
    user_id: req.user.id,
    mariage_type,
    parent_mariage_type,
    report: {
      // ListOfIssues: ListOfIssues,
      // ListOfCheckBox = {1: false, 2: true, ...}
      ListOfCheckBox: ListOfCheckBoxArray,
    },
    // user,
  };

  // Update User Information {firstName, lastName, gender, age}
  const updatedUser = await userService.updateUserById(req.user.id, {
    last_name,
    first_name,
    age,
    gender,
    mariage_type,
    parent_mariage_type,
  });

  // consult
  const isHaveIssues = ListOfCheckBoxArray.some((val) => val.value == true);

  // calculate and get
  // [result_reason]

  // IF parent_mariage_type === FAMILY && mariage_type === FAMILY
  // result will be =>  TRUE

  if (mariage_type === 'FAMILY' && parent_mariage_type === 'FAMILY') {
    requestBodyForConsult.result_reason = 'RelationShip';
    requestBodyForConsult.result = true;
  } else if (isHaveIssues) {
    requestBodyForConsult.result_reason = 'Have_Issues';
    requestBodyForConsult.result = true;
  }

  const newConsult = await consultService.createConsult({ body: requestBodyForConsult });
  res.status(httpStatus.CREATED).send({newConsult, updatedUser});
});

const applyConsult = catchAsync(async (req, res) => {
  const { user_id, ListOfCheckBox, parent_mariage_type, mariage_type } = req.body;

  let newConsult = null;
  const isHaveIssues = ListOfCheckBox.some((val) => val.value == true);

  // check user
  // --------

  // check consult in DB
  const consultDoc = await consultService.getSpecificConsult({ id: req.params.consultId });

  if (!consultDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Consult Not Exist In DB');
  }

  // calculate and get
  // [result_reason]

  // IF parent_mariage_type === FAMILY && mariage_type === FAMILY
  // result will be =>  TRUE

  if (mariage_type === 'FAMILY' && parent_mariage_type === 'FAMILY') {
    consultDoc.consult.result_reason = 'RelationShip';
    consultDoc.consult.result = true;
    consultDoc.consult.ListOfCheckBox = ListOfCheckBox;

    newConsult = await consultDoc.consult.save();
    if (!newConsult) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Consult Could Not Update Result');
    }
    // IF In ListOfCheckBox we have issue
  } else if (isHaveIssues) {
    consultDoc.consult.result_reason = 'Have_Issues';
    consultDoc.consult.result = true;
    consultDoc.consult.report.ListOfCheckBox = ListOfCheckBox;

    newConsult = await consultDoc.consult.save();
    if (!newConsult) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Consult Could Not Update Result');
    }
  }

  res.status(httpStatus.CREATED).send(newConsult || consultDoc);
});

const getById = catchAsync(async (req, res) => {
  const consultDoc = await consultService.getSpecificConsult({
    id: req.params.consultId,
  });
  res.status(httpStatus.OK).send(consultDoc);
});

// const getAllReference = catchAsync(async (req, res) => {
//   const result = await referenceService.getAllReference({ query: req.query });
//   res.status(httpStatus.OK).send(result);
// });

// const getSpecificReference = catchAsync(async (req, res) => {
//   const result = await referenceService.getSpecificReference({
//     customer: req.query.customer,
//     reference_id: req.params.reference_id,
//   });
//   res.status(httpStatus.OK).send(result);
// });

// const createReference = catchAsync(async (req, res) => {
//   const newReference = await referenceService.createReference({ referenceBody: req.body });
//   res.status(httpStatus.CREATED).send(newReference);
// });

module.exports = {
  create,
  applyConsult,
  getById,
};

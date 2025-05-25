/* eslint-disable eqeqeq */
/* eslint-disable prefer-promise-reject-errors */
// const joi = require('joi');
const SMS_API = require('./index');

// const Schema = Joi.object({
//   number: Joi.number(),
//   type: Joi.string(),
// });


exports.Send = async (receptor, message = '') => new Promise((resolve, reject) => {
  SMS_API.Send({
    message,
    receptor,
  }, (response, status) => {
    if (response?.error) {
      reject({
        response,
        status,
      });
    }
    //   if(status = 400)
    resolve({
      response,
      status,
    });
  });
});

exports.Lookup = async (receptor, token = '') => new Promise((resolve, reject) => {
  SMS_API.VerifyLookup({
    receptor,
    token,
    template: "registerverify"
  }, function(response, status) {
    resolve({response})
    console.log(response);
    console.log(status);
  });
});




exports.SendVerify = (receptor, token) => new Promise((resolve, reject) => {
  SMS_API.VerifyLookup(
    {
      receptor,
      token,
      template: 'VerifyAccount',
    },
    (response, status) => {
      if (status == '500') {
        console.log('REJECT');
        reject(new Error({ response, status }));
      }

      resolve({ response, status });
    },
  );
});

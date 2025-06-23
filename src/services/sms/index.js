const Kavenegar = require('kavenegar');

const config = require('../../config/config');

const api = Kavenegar.KavenegarApi({
  apikey: config.SMS_PROVIDER_API_KEY,
});

module.exports = api;

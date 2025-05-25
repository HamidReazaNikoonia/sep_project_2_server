const request = require('request-promise');
const config = require('../../config/payment');

/**
 * Constructor for ZarinPal object.
 * @param {String} MerchantID
 * @param {bool} sandbox
 */
function ZarinPal(MerchantID, sandbox) {
  if (typeof MerchantID !== 'string') {
    throw new Error('MerchantId is invalid');
  }
  if (MerchantID.length === config.merchantIDLength) {
    this.merchant = MerchantID;
  } else {
    // eslint-disable-next-line no-console
    console.error(`The MerchantID must be ${config.merchantIDLength} Characters.`);
  }
  this.sandbox = sandbox || false;

  this.url = sandbox === true ? config.sandbox : config.https;
}

/**
 * Get Authority from ZarinPal
 * @param  {number} Amount [Amount on Tomans.]
 * @param  {String} CallbackURL
 * @param  {String} Description
 * @param  {String} Email
 * @param  {String} Mobile
 */
ZarinPal.prototype.PaymentRequest = function (input) {
  const self = this;

  console.log({merchantkir:self.merchant })

  const params = {
    merchant_id: self.merchant,
    amount: input.Amount,
    callback_url: input.CallbackURL,
    description: input.Description,
    email: input.Email,
    mobile: input.Mobile,
    order_id: input.order_id,
  };

  const promise = new Promise(function (resolve, reject) {
    self
      .request(self.url, config.API.PR, 'POST', params)
      .then(function (data) {
        console.log({data: data})
        if (data.data) {
          resolve({
            code: data.data.code,
            authority: data.data.authority,
            fee: data.data.fee,
            url: config.PG(self.sandbox) + data.data.authority,
          })
        } else {
          resolve({
            data
          })
        }
        // resolve({
        //   status: data.Status,
        //   authority: data.Authority,
        //   url: config.PG(self.sandbox) + data.Authority,
        // });
      })
      .catch(function (err) {
        reject(err);
      });
  });

  return promise;
};

/**
 * Validate Payment from Authority.
 * @param  {number} Amount
 * @param  {String} Authority
 */
ZarinPal.prototype.PaymentVerification = function (input) {
  const self = this;
  const params = {
    merchant_id: self.merchant,
    amount: input.amount,
    authority: input.authority,
  };

  const promise = new Promise(function (resolve, reject) {
    self
      .request(self.url, config.API.PV, 'POST', params)
      .then(function (data) {
        resolve(data);
      })
      .catch(function (err) {
        reject(err);
      });
  });

  return promise;
};

/**
 * Get Unverified Transactions
 * @param  {number} Amount
 * @param  {String} Authority
 */
ZarinPal.prototype.UnverifiedTransactions = function () {
  const self = this;
  const params = {
    MerchantID: self.merchant,
  };

  const promise = new Promise(function (resolve, reject) {
    self
      .request(self.url, config.API.UT, 'POST', params)
      .then(function (data) {
        resolve({
          status: data.Status,
          authorities: data.Authorities,
        });
      })
      .catch(function (err) {
        reject(err);
      });
  });

  return promise;
};

/**
 * Refresh Authority
 * @param  {number} Amount
 * @param  {String} Authority
 */
ZarinPal.prototype.RefreshAuthority = function (input) {
  const self = this;
  const params = {
    MerchantID: self.merchant,
    Authority: input.Authority,
    ExpireIn: input.Expire,
  };

  const promise = new Promise(function (resolve, reject) {
    self
      .request(self.url, config.API.RA, 'POST', params)
      .then(function (data) {
        resolve({
          status: data.Status,
        });
      })
      .catch(function (err) {
        reject(err);
      });
  });

  return promise;
};

/**
 * `request` module with ZarinPal structure.
 * @param  {String}   url
 * @param  {String}   module
 * @param  {String}   method
 * @param  {String}   data
 * @param  {Function} callback
 */
ZarinPal.prototype.request = function (url, module, method, data) {
  const urlI = url + module;

  const options = {
    method,
    url: urlI,
    headers: {
      'cache-control': 'no-cache',
      'content-type': 'application/json',
    },
    body: data,
    json: true,
  };

  return request(options);
};

/**
 * Remove EXTRA ooooo!
 * @param {number} token [API response Authority]
 */
ZarinPal.prototype.TokenBeautifier = function (token) {
  return token.split(/\b0+/g);
};

/**
 * Export version module.
 */
// exports.version = require("../package.json").version;

/**
 * Create ZarinPal object. Wrapper around constructor.
 */
exports.create = function (MerchantID, sandbox) {
  return new ZarinPal(MerchantID, sandbox);
};

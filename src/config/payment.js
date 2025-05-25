const config = {
  https: 'https://payment.zarinpal.com/pg/v4/payment/',
  sandbox: 'https://sandbox.zarinpal.com/pg/v4/payment/',
  merchantIDLength: 36,
  API: {
    PR: 'request.json',
    PRX: 'PaymentRequestWithExtra.json',
    PV: 'verify.json',
    PVX: 'PaymentVerificationWithExtra.json',
    RA: 'RefreshAuthority.json',
    UT: 'UnverifiedTransactions.json',
  },
  PG(sandbox) {
    if (sandbox) {
      return 'https://sandbox.zarinpal.com/pg/StartPay/';
    }
    return 'https://payment.zarinpal.com/pg/StartPay/';
  },
};

module.exports = config;

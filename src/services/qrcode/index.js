const QRCode = require('qrcode');

module.exports = async (data) => {
  const qr = await QRCode.toDataURL(data);
  return qr;
};

const multer = require('multer');
// define multer storage configuration

const generateRandomId = Math.floor((Math.random() * 1000000) + 1);
const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, `${process.env.PWD}/storage/`);
  },
  filename(req, file, callback) {
    callback(null, `${generateRandomId}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100000000 },
});

module.exports = upload;

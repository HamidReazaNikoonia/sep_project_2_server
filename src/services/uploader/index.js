const multer = require('multer');
const path = require('path');

const generateRandomId = Math.floor(Math.random() * 1000000 + 1);
const storage = multer.diskStorage({
  destination(req, file, callback) {
    // Use path.join with __dirname for a reliable absolute path
    const storagePath = path.join(__dirname, '../../../storage/');
    callback(null, storagePath);
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

const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadDirectory = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${timestamp}-${sanitized}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const isCsv =
    file.mimetype === "text/csv" ||
    file.originalname.toLowerCase().endsWith(".csv") ||
    file.mimetype === "application/vnd.ms-excel";

  if (!isCsv) {
    const error = new Error("Only CSV files are allowed");
    error.statusCode = 400;
    return cb(error);
  }

  cb(null, true);
};

module.exports = multer({
  storage,
  fileFilter
});

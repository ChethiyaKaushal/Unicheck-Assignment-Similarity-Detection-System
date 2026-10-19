
const multer = require("multer");

// Keep uploaded files in memory instead of saving them to a public folder.
const storage = multer.memoryStorage();

// Validate uploaded files.
const fileFilter = (req, file, cb) => {
    const isPdfMimeType = file.mimetype === "application/pdf";
    const hasPdfExtension = /\.pdf$/i.test(file.originalname);

    if (isPdfMimeType && hasPdfExtension) {
        return cb(null, true);
    }

    cb(new Error("Only PDF files are allowed."));
};

// Configure the upload middleware.
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB maximum
        files: 1
    }
});

module.exports = upload;

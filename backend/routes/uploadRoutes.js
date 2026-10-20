
const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");

const {
    uploadQuestionPaper
} = require("../controllers/uploadController");

const router = express.Router();

// Upload a question paper PDF.
// Only authenticated lecturers can access this endpoint.
router.post(
    "/question-paper",
    authMiddleware,
    authorizeRoles("lecturer"),
    (req, res, next) => {
        if (req.user.mustChangePassword) {
            return res.status(403).json({
                message: "Please change your password before continuing."
            });
        }

        next();
    },
    upload.single("pdf"),
    uploadQuestionPaper
);

module.exports = router;

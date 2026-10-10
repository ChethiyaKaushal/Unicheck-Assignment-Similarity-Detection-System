const express = require("express");

const {
    createUser,
    loginUser,
    changePassword,
    updateUserStatus
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const router = express.Router();


// Public route: Log in
router.post("/login", loginUser);


// Authenticated route: Change password
// This route must remain accessible when mustChangePassword is true.
router.post(
    "/change-password",
    authMiddleware,
    changePassword
);


// Admin only: Create student or lecturer accounts
router.post(
    "/users",
    authMiddleware,
    authorizeRoles("admin"),
    (req, res, next) => {
        if (req.user.mustChangePassword) {
            return res.status(403).json({
                message: "Please change your password before continuing."
            });
        }

        next();
    },
    createUser
);


// Admin only: Activate or deactivate a user account
router.patch(
    "/users/:userId/status",
    authMiddleware,
    authorizeRoles("admin"),
    (req, res, next) => {
        if (req.user.mustChangePassword) {
            return res.status(403).json({
                message: "Please change your password before continuing."
            });
        }

        next();
    },
    updateUserStatus
);


module.exports = router;
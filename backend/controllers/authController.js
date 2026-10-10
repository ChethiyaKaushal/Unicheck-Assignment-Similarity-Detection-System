const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Create a user account (admin only - route protection required)
const createUser = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !email.trim() ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                message: "Please provide username, email, password, and role."
            });
        }

        const cleanUsername = username.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                message: "Please provide a valid email address."
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                message: "Password must be between 8 and 72 characters."
            });
        }

        // Admins can create student or lecturer accounts.
        // The initial admin will be created through a separate setup process.
        if (!["student", "lecturer"].includes(role)) {
            return res.status(400).json({
                message: "Role must be student or lecturer."
            });
        }

        const existingUser = await User.findOne({
            $or: [
                { username: cleanUsername },
                { email: cleanEmail }
            ]
        });

        if (existingUser) {
            return res.status(409).json({
                message: "Username or email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await User.create({
            username: cleanUsername,
            email: cleanEmail,
            password: hashedPassword,
            role,
            status: "active",
            mustChangePassword: true
        });

        return res.status(201).json({
            message: "User account created successfully.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
                mustChangePassword: user.mustChangePassword
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: "Username or email is already registered."
            });
        }

        console.error("Create user error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred."
        });
    }
};


// Log in an existing user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            !email.trim() ||
            typeof password !== "string" ||
            !password
        ) {
            return res.status(400).json({
                message: "Please provide email and password."
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase()
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: "Invalid email or password."
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                message: "Your account is inactive. Please contact the administrator."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                message: "Authentication service is not configured."
            });
        }

        // The token identifies the user; role permissions are checked by middleware.
        const token = jwt.sign(
            {
                userId: user._id.toString()
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1h"
            }
        );

        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                mustChangePassword: user.mustChangePassword
            }
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred."
        });
    }
};


// Change password (authenticated user)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string" ||
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                message: "Please provide your current and new passwords."
            });
        }

        if (newPassword.length < 8 || newPassword.length > 72) {
            return res.status(400).json({
                message: "New password must be between 8 and 72 characters."
            });
        }

        const user = await User.findById(req.user.userId);

        if (!user || user.status !== "active") {
            return res.status(401).json({
                message: "User account is unavailable."
            });
        }

        const passwordMatches = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: "Current password is incorrect."
            });
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (samePassword) {
            return res.status(400).json({
                message: "New password must be different from the current password."
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.mustChangePassword = false;

        await user.save();

        return res.status(200).json({
            message: "Password changed successfully. Please log in again."
        });
    } catch (error) {
        console.error("Change password error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred."
        });
    }
};


// Activate or deactivate a user account (admin only - route protection required)
const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { userId } = req.params;

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                message: "Status must be active or inactive."
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        user.status = status;
        await user.save();

        return res.status(200).json({
            message: `User account ${status === "active" ? "activated" : "deactivated"} successfully.`,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error("Update user status error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred."
        });
    }
};


module.exports = {
    createUser,
    loginUser,
    changePassword,
    updateUserStatus
};

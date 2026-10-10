const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Verify the user's JWT and load their current account details
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication token is required."
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Authentication token is required."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                message: "Authentication service is not configured."
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user in MongoDB
        const user = await User.findById(decoded.userId).select(
            "_id username email role status mustChangePassword"
        );

        if (!user || user.status !== "active") {
            return res.status(401).json({
                message: "User account is unavailable."
            });
        }

        // Store verified user details for the next middleware/controller
        req.user = {
            userId: user._id.toString(),
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            mustChangePassword: user.mustChangePassword
        };

        next();
    } catch (error) {
        if (
            error.name === "JsonWebTokenError" ||
            error.name === "TokenExpiredError" ||
            error.name === "NotBeforeError"
        ) {
            return res.status(401).json({
                message: "Invalid or expired authentication token."
            });
        }

        console.error("Authentication error:", error.message);

        return res.status(500).json({
            message: "An internal server error occurred."
        });
    }
};

module.exports = authMiddleware;
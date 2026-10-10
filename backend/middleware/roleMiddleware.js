const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        // Authentication middleware must run first
        if (!req.user) {
            return res.status(401).json({
                message: "Please log in to access this resource."
            });
        }

        // Check whether the user's role is permitted
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: "You do not have permission to perform this action."
            });
        }

        next();
    };
};

module.exports = authorizeRoles;
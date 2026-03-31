import ApiError from "../utils/ApiError.js";

export const restrictToVerified = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError(401, "Access denied. No token provided."));
    }

    if (!req.user.isVerified) {
        return next(new ApiError(403, "Access denied. Complete your profile to continue."));
    }

    next();
};

export const restrictToRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Access denied. No token provided."));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new ApiError(403, "Access denied. Insufficient permissions."));
        }

        next();
    };
};

export const restrictToVerifiedAndRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Access denied. No token provided."));
        }

        if (!req.user.isVerified) {
            return next(new ApiError(403, "Access denied. Complete your profile to continue."));
        }

        if (!allowedRoles.includes(req.user.role)) {
            return next(new ApiError(403, "Access denied. Insufficient permissions."));
        }

        next();
    };
};

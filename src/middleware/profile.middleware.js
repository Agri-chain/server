import ApiError from "../utils/ApiError.js";

export const isProfileComplete = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError(401, "Access denied. No token provided."));
    }

    if (!req.user.isProfileComplete()) {
        return next(new ApiError(403, "Access denied. Profile completion required."));
    }

    next();
};

export const canBuyOrSell = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError(401, "Access denied. No token provided."));
    }

    if (!req.user.isVerified) {
        return next(new ApiError(403, "Access denied. Account verification required."));
    }

    next();
};

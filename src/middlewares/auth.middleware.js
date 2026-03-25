import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import ApiError from "../utils/ApiError.js";

export const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.refreshToken;

    if (!token) {
        return next(new ApiError(401, "Access denied. No token provided."));
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded._id);
        
        if (!user) {
            return next(new ApiError(401, "Invalid token. User not found."));
        }

        req.user = user;
        next();
    } catch (error) {
        return next(new ApiError(401, "Invalid token."));
    }
};

export const authorizeRoles = (...allowedRoles) => {
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

export const isVerified = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError(401, "Access denied. No token provided."));
    }

    if (!req.user.isVerified) {
        return next(new ApiError(403, "Access denied. Account not verified."));
    }

    next();
};

export const isFullyVerified = (req, res, next) => {
    if (!req.user) {
        return next(new ApiError(401, "Access denied. No token provided."));
    }

    if (!req.user.isFullyVerified()) {
        return next(new ApiError(403, "Access denied. Complete profile verification required."));
    }

    next();
};

export const optionalAuth = async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.refreshToken;

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded._id);
        
        if (user) {
            req.user = user;
        }
    } catch (error) {
        // Continue without user
    }

    next();
};

import express from "express";
import multer from "multer";
import { completeProfile, updateProfile, getProfile, verifyAadhaar, uploadAvatar, deleteAvatar } from "../controllers/profile.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { uploadAvatar as avatarUpload } from "../middleware/multer.middleware.js";
import ApiError from "../utils/ApiError.js";

const router = express.Router();

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Max 5MB allowed.' });
        }
        return res.status(400).json({ message: err.message });
    }
    if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
};

router.get("/", verifyToken, getProfile);
router.post("/complete", verifyToken, completeProfile);
router.put("/update", verifyToken, updateProfile);
router.post("/avatar", verifyToken, avatarUpload.single('avatar'), handleMulterError, uploadAvatar);
router.delete("/avatar", verifyToken, deleteAvatar);
router.post("/verify-aadhaar", verifyToken, verifyAadhaar);

export default router;

import express from "express";
import { registerUser, loginUser, googleAuth, adminLogin, refreshToken, logout, checkGoogleUserExists } from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import ApiResponse from "../utils/ApiResponse.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google-auth", googleAuth);
router.get("/google-user-exists", checkGoogleUserExists);
router.post("/admin/login", adminLogin);
router.post("/refresh-token", refreshToken); // No verifyToken middleware
router.post("/logout", logout);

router.get("/verify-token", verifyToken, (req, res) => {
    res.status(200).json(new ApiResponse(200, {
        user: {
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role,
            provider: req.user.provider,
            isVerified: req.user.isVerified,
            phoneVerified: req.user.phoneVerified,
            emailVerified: req.user.emailVerified,
            aadhaarVerified: req.user.aadhaarVerified,
            isFullyVerified: req.user.isFullyVerified()
        }
    }, "Token is valid"));
});

export default router;

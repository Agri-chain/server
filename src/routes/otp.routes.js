import express from "express";
import { generateEmailOTP, verifyEmailOTP, generateAadhaarOTP, verifyAadhaarOTP, sendPasswordResetOTP, verifyPasswordResetOTP, verifyPasswordResetOTPOnly, generatePreRegisterEmailOTP, verifyPreRegisterEmailOTP } from "../controllers/otp.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Email OTP for existing users
router.post("/email/send", generateEmailOTP);
router.post("/email/verify", verifyEmailOTP);

// Pre-registration Email OTP (for new users)
router.post("/pre-register/send", generatePreRegisterEmailOTP);
router.post("/pre-register/verify", verifyPreRegisterEmailOTP);

// Aadhaar OTP (via Email)
router.post("/aadhaar/send", verifyToken, generateAadhaarOTP);
router.post("/aadhaar/verify", verifyToken, verifyAadhaarOTP);

// Password Reset
router.post("/password-reset/send", sendPasswordResetOTP);
router.post("/password-reset/verify-only", verifyPasswordResetOTPOnly);
router.post("/password-reset/verify", verifyPasswordResetOTP);

export default router;

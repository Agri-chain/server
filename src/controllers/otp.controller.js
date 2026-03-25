import User from "../models/User.model.js";
import TempEmailVerification from "../models/TempEmailVerification.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendEmailOTP } from "../utils/mail.js";

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const updateProfileCompletionStatus = async (userId) => {
    const user = await User.findById(userId);
    if (user) {
        user.isVerified = user.isFullyVerified();
        await user.save();
    }
};

// Pre-registration Email OTP (for new users before they register)
export const generatePreRegisterEmailOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, "Email already registered");
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save or update temp verification
    await TempEmailVerification.findOneAndUpdate(
        { email },
        { email, otp, otpExpiry: expiresAt, verified: false },
        { upsert: true }
    );

    await sendEmailOTP(email, otp);

    res.status(200).json(new ApiResponse(200, {
        message: "Verification code sent to email",
        expiresIn: 10 * 60
    }, "OTP sent"));
});

export const verifyPreRegisterEmailOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    const tempVerification = await TempEmailVerification.findOne({ email });

    if (!tempVerification) {
        throw new ApiError(400, "No verification pending for this email");
    }

    if (tempVerification.otp !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }

    if (tempVerification.otpExpiry < Date.now()) {
        throw new ApiError(400, "OTP has expired");
    }

    // Mark as verified
    tempVerification.verified = true;
    await tempVerification.save();

    res.status(200).json(new ApiResponse(200, {
        email: tempVerification.email,
        verified: true
    }, "Email verified successfully"));
});

// Email OTP
export const generateEmailOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.emailOTP = otp;
    user.emailOTPExpires = expiresAt;
    await user.save();

    await sendEmailOTP(email, otp);

    res.status(200).json(new ApiResponse(200, {
        message: "Email OTP sent successfully",
        expiresIn: 5 * 60
    }, "Email OTP sent"));
});

export const verifyEmailOTP = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    const user = await User.findOne({ email }).select('+emailOTP +emailOTPExpires');
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.emailOTP || !user.emailOTPExpires) {
        throw new ApiError(400, "No OTP generated");
    }

    if (user.emailOTPExpires < new Date()) {
        throw new ApiError(400, "OTP has expired");
    }

    if (user.emailOTP !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }

    user.emailVerified = true;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();

    await updateProfileCompletionStatus(user._id);

    res.status(200).json(new ApiResponse(200, {
        emailVerified: true,
        isProfileComplete: user.isFullyVerified()
    }, "Email verified successfully"));
});

// Aadhaar verification via Email OTP
export const generateAadhaarOTP = asyncHandler(async (req, res) => {
    const { aadhaar } = req.body;
    console.log('📝 Aadhaar OTP Request:', { aadhaar, userId: req.user?._id });

    if (!aadhaar) {
        throw new ApiError(400, "Aadhaar number is required");
    }

    if (!/^\d{12}$/.test(aadhaar)) {
        throw new ApiError(400, "Invalid Aadhaar number format");
    }

    if (!req.user) {
        throw new ApiError(401, "Authentication required");
    }

    if (!req.user.emailVerified) {
        throw new ApiError(400, "Email must be verified first");
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    console.log('🔢 Generated OTP:', { otp, expiresAt });

    try {
        // Get user from DB to ensure we can modify it
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(404, "User not found");
        }
        console.log('👤 User found:', { email: user.email, id: user._id });

        user.aadhaarOTP = otp;
        user.aadhaarOTPExpires = expiresAt;
        user.aadhaar = aadhaar;
        
        console.log('💾 Saving user with Aadhaar data...');
        await user.save();
        console.log('✅ User saved successfully');

        console.log('📧 Sending email OTP to:', user.email);
        await sendEmailOTP(user.email, otp, "Aadhaar Verification OTP");
        console.log('✅ Email sent successfully');

        res.status(200).json(new ApiResponse(200, {
            message: "Aadhaar OTP sent to your registered email",
            expiresIn: 5 * 60
        }, "Aadhaar OTP sent"));
    } catch (error) {
        console.error("❌ Aadhaar OTP Error:", error.message);
        console.error("Full error:", error);
        throw new ApiError(500, error.message || "Failed to generate Aadhaar OTP");
    }
});

export const verifyAadhaarOTP = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    if (!otp) {
        throw new ApiError(400, "OTP is required");
    }

    if (!req.user) {
        throw new ApiError(401, "Authentication required");
    }

    const user = await User.findById(req.user._id).select('+aadhaarOTP +aadhaarOTPExpires');
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.aadhaarOTP || !user.aadhaarOTPExpires) {
        throw new ApiError(400, "No Aadhaar OTP generated");
    }

    if (user.aadhaarOTPExpires < new Date()) {
        throw new ApiError(400, "Aadhaar OTP has expired");
    }

    if (user.aadhaarOTP !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }

    user.aadhaarVerified = true;
    user.aadhaarOTP = undefined;
    user.aadhaarOTPExpires = undefined;
    await user.save();

    await updateProfileCompletionStatus(user._id);

    res.status(200).json(new ApiResponse(200, {
        aadhaarVerified: true,
        isProfileComplete: user.isFullyVerified()
    }, "Aadhaar verified successfully"));
});

// Password Reset
export const sendPasswordResetOTP = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.emailOTP = otp;
    user.emailOTPExpires = expiresAt;
    await user.save();

    await sendEmailOTP(email, otp);

    res.status(200).json(new ApiResponse(200, {
        message: "Password reset OTP sent successfully",
        expiresIn: 5 * 60
    }, "Password reset OTP sent"));
});

export const verifyPasswordResetOTP = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required");
    }

    const user = await User.findOne({ email }).select('+emailOTP +emailOTPExpires +password');
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.emailOTP || !user.emailOTPExpires) {
        throw new ApiError(400, "No OTP generated");
    }

    if (user.emailOTPExpires < new Date()) {
        throw new ApiError(400, "OTP has expired");
    }

    if (user.emailOTP !== otp) {
        throw new ApiError(400, "Invalid OTP");
    }

    user.password = newPassword;
    user.emailOTP = undefined;
    user.emailOTPExpires = undefined;
    await user.save();

    res.status(200).json(new ApiResponse(200, {
        message: "Password reset successfully"
    }, "Password reset successful"));
});

export const verifyPasswordResetOTPOnly = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required");
    }

    const user = await User.findOne({ email }).select('+emailOTP +emailOTPExpires');
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.emailOTP || !user.emailOTPExpires) {
        throw new ApiError(400, "No OTP generated. Please request a new OTP.");
    }

    if (user.emailOTPExpires < new Date()) {
        throw new ApiError(400, "OTP has expired. Please request a new OTP.");
    }

    if (user.emailOTP !== otp) {
        throw new ApiError(400, "Invalid OTP. Please try again.");
    }

    res.status(200).json(new ApiResponse(200, {
        message: "OTP verified successfully",
        verified: true
    }, "OTP verified"));
});

// Phone OTP functions removed - phone is now optional profile data only
export const generatePhoneOTP = asyncHandler(async (req, res) => {
    throw new ApiError(410, "Phone verification has been disabled. Phone number is now optional profile data only.");
});

export const verifyPhoneOTP = asyncHandler(async (req, res) => {
    throw new ApiError(410, "Phone verification has been disabled. Phone number is now optional profile data only.");
});

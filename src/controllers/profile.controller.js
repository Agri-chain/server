import User from "../models/User.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.config.js";

const updateProfileCompletionStatus = async (userId) => {
    const user = await User.findById(userId);
    if (user) {
        user.isVerified = user.isFullyVerified();
        await user.save();
    }
};

// Helper to extract public ID from Cloudinary URL
const getPublicIdFromUrl = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    const matches = url.match(/\/v\d+\/(.+)\./);
    return matches ? matches[1] : null;
};

export const uploadAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new ApiError(400, "Please upload an image file");
    }

    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Delete old avatar from Cloudinary if exists
    if (user.avatar) {
        const publicId = getPublicIdFromUrl(user.avatar);
        if (publicId) {
            await deleteFromCloudinary(publicId);
        }
    }

    // Upload to Cloudinary
    try {
        const result = await uploadToCloudinary(req.file.buffer, 'avatars');
        user.avatar = result.secure_url;
        await user.save();

        res.status(200).json(new ApiResponse(200, {
            avatar: result.secure_url
        }, "Profile image uploaded successfully"));
    } catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new ApiError(500, "Failed to upload image to Cloudinary");
    }
});

export const deleteAvatar = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.avatar) {
        throw new ApiError(400, "No profile image to delete");
    }

    // Delete from Cloudinary
    const publicId = getPublicIdFromUrl(user.avatar);
    if (publicId) {
        await deleteFromCloudinary(publicId);
    }
    
    // Remove avatar from user
    user.avatar = "";
    await user.save();

    res.status(200).json(new ApiResponse(200, {}, "Profile image removed successfully"));
});

export const completeProfile = asyncHandler(async (req, res) => {
    const { phone, aadhaar, fullName } = req.body;
    const userId = req.user._id;

    if (!phone) {
        throw new ApiError(400, "Phone number is required");
    }

    const existingPhone = await User.findOne({ phone, _id: { $ne: userId } });
    if (existingPhone) {
        throw new ApiError(409, "Phone number already exists");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.phone = phone;
    if (fullName) user.name = fullName;
    
    // Aadhaar is optional during initial profile completion
    // It will be required for full verification later
    if (aadhaar) {
        const existingAadhaar = await User.findOne({ aadhaar, _id: { $ne: userId } });
        if (existingAadhaar) {
            throw new ApiError(409, "Aadhaar number already exists");
        }
        user.aadhaar = aadhaar;
    }
    
    await user.save();

    res.status(200).json(new ApiResponse(200, {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            aadhaar: user.aadhaar,
            phoneVerified: user.phoneVerified,
            emailVerified: user.emailVerified,
            aadhaarVerified: user.aadhaarVerified,
            isVerified: user.isVerified,
            isProfileComplete: user.isProfileComplete(),
            nextStep: user.phoneVerified ? (user.aadhaar ? "aadhaar_verification" : "aadhaar_required") : "phone_verification"
        }
    }, "Profile updated. Complete phone verification to proceed."));
});

export const updateProfile = asyncHandler(async (req, res) => {
    const { name, phone, dateOfBirth, gender, address, city, state, pincode } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (name) user.name = name;
    if (phone) {
        const existingPhone = await User.findOne({ phone, _id: { $ne: userId } });
        if (existingPhone) {
            throw new ApiError(409, "Phone number already exists");
        }
        user.phone = phone;
    }
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (gender) user.gender = gender;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (pincode) user.pincode = pincode;

    await user.save();

    res.status(200).json(new ApiResponse(200, {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            aadhaar: user.aadhaar,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            address: user.address,
            city: user.city,
            state: user.state,
            pincode: user.pincode,
            avatar: user.avatar,
            phoneVerified: user.phoneVerified,
            emailVerified: user.emailVerified,
            aadhaarVerified: user.aadhaarVerified,
            isVerified: user.isVerified
        }
    }, "Profile updated successfully"));
});

export const getProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    res.status(200).json(new ApiResponse(200, {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            aadhaar: user.aadhaar,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            address: user.address,
            city: user.city,
            state: user.state,
            pincode: user.pincode,
            avatar: user.avatar,
            phoneVerified: user.phoneVerified,
            emailVerified: user.emailVerified,
            aadhaarVerified: user.aadhaarVerified,
            isVerified: user.isVerified,
            isFullyVerified: user.isFullyVerified()
        }
    }, "Profile retrieved successfully"));
});

export const verifyAadhaar = asyncHandler(async (req, res) => {
    const { aadhaar } = req.body;
    const userId = req.user._id;

    if (!aadhaar) {
        throw new ApiError(400, "Aadhaar number is required");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.aadhaar !== aadhaar) {
        throw new ApiError(400, "Aadhaar number does not match");
    }

    // Simulated Aadhaar verification
    user.aadhaarVerified = true;
    await user.save();

    // Update profile completion status
    await updateProfileCompletionStatus(userId);

    const isFullyVerified = user.isFullyVerified();
    if (isFullyVerified) {
        user.isVerified = true;
        await user.save();
    }

    res.status(200).json(new ApiResponse(200, {
        aadhaarVerified: true,
        isFullyVerified: isFullyVerified,
        isProfileComplete: user.isProfileComplete(),
        accountVerified: user.isVerified
    }, "Aadhaar verified successfully"));
});

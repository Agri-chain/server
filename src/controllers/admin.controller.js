import User from "../models/User.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Get all users (Admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
    const users = await User.find({ role: { $ne: 'admin' } })
        .select('-password -refreshToken -emailOTP -emailOTPExpires -aadhaarOTP -aadhaarOTPExpires')
        .sort({ createdAt: -1 });

    const stats = await User.aggregate([
        {
            $match: { role: { $ne: 'admin' } }
        },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                farmers: { $sum: { $cond: [{ $eq: ['$role', 'farmer'] }, 1, 0] } },
                buyers: { $sum: { $cond: [{ $eq: ['$role', 'buyer'] }, 1, 0] } },
                logistics: { $sum: { $cond: [{ $eq: ['$role', 'logistics'] }, 1, 0] } },
                verified: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
                emailVerified: { $sum: { $cond: [{ $eq: ['$emailVerified', true] }, 1, 0] } },
                aadhaarVerified: { $sum: { $cond: [{ $eq: ['$aadhaarVerified', true] }, 1, 0] } }
            }
        }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = await User.countDocuments({
        role: { $ne: 'admin' },
        createdAt: { $gte: today }
    });

    res.status(200).json(new ApiResponse(200, {
        users,
        totalUsers: users.length,
        stats: stats[0] || {
            total: 0,
            farmers: 0,
            buyers: 0,
            logistics: 0,
            verified: 0,
            emailVerified: 0,
            aadhaarVerified: 0
        },
        newUsersToday
    }, "Users fetched successfully"));
});

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: today } });

    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const pendingVerification = await User.countDocuments({ isVerified: false });

    const roleDistribution = await User.aggregate([
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 }
            }
        }
    ]);

    const roleStats = {};
    roleDistribution.forEach(item => {
        roleStats[item._id] = item.count;
    });

    const verificationStats = {
        emailVerified: await User.countDocuments({ emailVerified: true }),
        aadhaarVerified: await User.countDocuments({ aadhaarVerified: true }),
        fullyVerified: await User.countDocuments({ emailVerified: true, aadhaarVerified: true })
    };

    // Get recent registrations (last 7 days)
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const recentRegistrations = await User.aggregate([
        {
            $match: {
                createdAt: { $gte: last7Days }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { _id: 1 }
        }
    ]);

    res.status(200).json(new ApiResponse(200, {
        totalUsers,
        newUsersToday,
        verifiedUsers,
        pendingVerification,
        roleDistribution: roleStats,
        verificationStats,
        recentRegistrations
    }, "Dashboard stats fetched"));
});

// Delete user (Admin only)
export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.role === 'admin') {
        throw new ApiError(403, "Cannot delete admin users");
    }

    await User.findByIdAndDelete(id);

    res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"));
});

// Toggle user verification status
export const toggleUserVerification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    user.isVerified = !user.isVerified;
    await user.save();

    res.status(200).json(new ApiResponse(200, {
        userId: user._id,
        isVerified: user.isVerified
    }, "User verification status updated"));
});

// Ban/Unban user
export const toggleUserBan = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (user.role === 'admin') {
        throw new ApiError(403, "Cannot ban admin users");
    }

    user.isBanned = !user.isBanned;
    await user.save();

    res.status(200).json(new ApiResponse(200, {
        userId: user._id,
        isBanned: user.isBanned
    }, user.isBanned ? "User banned successfully" : "User unbanned successfully"));
});

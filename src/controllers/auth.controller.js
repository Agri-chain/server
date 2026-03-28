import User from "../models/User.model.js";
import TempEmailVerification from "../models/TempEmailVerification.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        throw new ApiError(400, "All fields are required");
    }

    if (!['farmer', 'buyer', 'logistics', 'admin'].includes(role)) {
        throw new ApiError(400, "Invalid role");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new ApiError(409, "User already exists");
    }

    // Check if email is verified (skip for admin role)
    if (role !== 'admin') {
        const tempVerification = await TempEmailVerification.findOne({ email });
        if (!tempVerification || !tempVerification.verified) {
            throw new ApiError(403, "Email not verified. Please verify your email before registering.");
        }
    }

    const universalRoleId = `${role}-${Date.now()}`;
    const user = new User({
        name,
        email,
        password,
        role,
        provider: 'LOCAL',
        universal_role_id: universalRoleId,
        emailVerified: true // Mark as verified since we checked above
    });

    await user.save();

    // Clean up temp verification
    await TempEmailVerification.deleteOne({ email });

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json(new ApiResponse(201, {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            provider: user.provider,
            isVerified: user.isVerified,
            phoneVerified: user.phoneVerified,
            emailVerified: user.emailVerified,
            aadhaarVerified: user.aadhaarVerified,
            isProfileComplete: user.isProfileComplete()
        },
        accessToken,
        refreshToken
    }, "User registered successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('🔑 Login attempt:', email);

        if (!email || !password) {
            throw new ApiError(400, "Email and password are required");
        }

        const user = await User.findOne({ email }).select('+password');
        console.log('👤 User found:', user ? 'YES' : 'NO');
        
        if (!user) {
            throw new ApiError(401, "Invalid credentials");
        }

        console.log('🔐 Checking password...');
        const isPasswordValid = await user.isPasswordCorrect(password);
        console.log('🔐 Password valid:', isPasswordValid);
        
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid credentials");
        }

        if (user.isBanned) {
            throw new ApiError(403, "Account is banned");
        }

        console.log('🎫 Generating tokens...');
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        console.log('✅ Tokens generated');

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(200).json(new ApiResponse(200, {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                provider: user.provider,
                isVerified: user.isVerified,
                phoneVerified: user.phoneVerified,
                emailVerified: user.emailVerified,
                aadhaarVerified: user.aadhaarVerified,
                isProfileComplete: user.isProfileComplete()
            },
            accessToken,
            refreshToken
        }, "Login successful"));
    } catch (error) {
        console.error('❌ Login error:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    }
});

export const checkGoogleUserExists = asyncHandler(async (req, res) => {
    const { email, googleId } = req.query;

    if (!email || !googleId) {
        throw new ApiError(400, "Email and googleId are required");
    }

    try {
        // Check if user exists with this googleId
        const userByGoogleId = await User.findOne({ googleId });
        
        if (userByGoogleId) {
            return res.status(200).json(new ApiResponse(200, {
                exists: true,
                isNewUser: false,
                user: {
                    _id: userByGoogleId._id,
                    name: userByGoogleId.name,
                    email: userByGoogleId.email,
                    role: userByGoogleId.role,
                    provider: userByGoogleId.provider
                }
            }, "Google user found"));
        }

        // Check if user exists with this email (but not googleId)
        const userByEmail = await User.findOne({ email, googleId: { $exists: false } });
        
        if (userByEmail) {
            return res.status(200).json(new ApiResponse(200, {
                exists: true,
                isNewUser: false,
                canLinkGoogle: true,
                user: {
                    _id: userByEmail._id,
                    name: userByEmail.name,
                    email: userByEmail.email,
                    role: userByEmail.role,
                    provider: userByEmail.provider
                }
            }, "Email user found - can link Google"));
        }

        // New user
        return res.status(200).json(new ApiResponse(200, {
            exists: false,
            isNewUser: true
        }, "New Google user"));
    } catch (error) {
        console.error('❌ Error checking Google user:', error);
        throw error;
    }
});

export const googleAuth = asyncHandler(async (req, res) => {
    console.log('🔥 Google Auth Request received');
    console.log('Request body:', req.body);
    
    const { email, name, googleId, role, picture, emailVerified } = req.body;
    
    console.log('Extracted data:', { email, name, googleId, role, picture, emailVerified });

    if (!email || !name || !googleId) {
        console.log('❌ Validation failed - missing required fields');
        throw new ApiError(400, "Email, name, and googleId are required");
    }

    try {
        // First check if user exists with this googleId
        let user = await User.findOne({ googleId });
        console.log('Found user by googleId:', user ? 'YES' : 'NO');
        
        if (user) {
            // Existing Google user - login directly
            console.log('✅ Existing Google user found, logging in');
            const accessToken = user.generateAccessToken();
            const refreshToken = user.generateRefreshToken();

            user.refreshToken = refreshToken;
            await user.save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: false,
                secure: false,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.status(200).json(new ApiResponse(200, {
                user: {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    provider: user.provider,
                    isVerified: user.isVerified,
                    phoneVerified: user.phoneVerified,
                    emailVerified: user.emailVerified,
                    aadhaarVerified: user.aadhaarVerified,
                    isProfileComplete: user.isProfileComplete()
                },
                accessToken,
                refreshToken,
                isNewUser: false
            }, "Google login successful"));
        }

        // Check if user exists with this email (but not googleId)
        const existingUser = await User.findOne({ email, googleId: { $exists: false } });
        console.log('Found user by email without googleId:', existingUser ? 'YES' : 'NO');
        
        if (existingUser) {
            // User exists with email but not Google - link Google account
            console.log('🔗 Linking Google account to existing email account');
            existingUser.googleId = googleId;
            existingUser.provider = 'GOOGLE';
            existingUser.emailVerified = true;
            if (picture) existingUser.picture = picture;
            await existingUser.save();
            
            const accessToken = existingUser.generateAccessToken();
            const refreshToken = existingUser.generateRefreshToken();

            existingUser.refreshToken = refreshToken;
            await existingUser.save();

            res.cookie('refreshToken', refreshToken, {
                httpOnly: false,
                secure: false,
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return res.status(200).json(new ApiResponse(200, {
                user: {
                    _id: existingUser._id,
                    name: existingUser.name,
                    email: existingUser.email,
                    role: existingUser.role,
                    provider: existingUser.provider,
                    isVerified: existingUser.isVerified,
                    phoneVerified: existingUser.phoneVerified,
                    emailVerified: existingUser.emailVerified,
                    aadhaarVerified: existingUser.aadhaarVerified,
                    isProfileComplete: existingUser.isProfileComplete()
                },
                accessToken,
                refreshToken,
                isNewUser: false
            }, "Google account linked successfully"));
        }

        // New user - validate role is provided
        if (!role) {
            console.log('❌ New user but no role provided');
            throw new ApiError(400, "Role is required for new Google users");
        }

        if (!['farmer', 'buyer', 'logistics'].includes(role)) {
            console.log('❌ Validation failed - invalid role:', role);
            throw new ApiError(400, "Invalid role");
        }

        // Create new Google user
        const universalRoleId = `${role}-${Date.now()}`;
        console.log('🔧 Creating new Google user with data:', {
            name,
            email,
            role,
            provider: 'GOOGLE',
            googleId,
            universalRoleId,
            emailVerified: true
        });
        
        user = new User({
            name,
            email,
            role,
            provider: 'GOOGLE',
            googleId,
            password: null,
            universal_role_id: universalRoleId,
            emailVerified: true,
            picture: picture || null
        });

        console.log('🔧 Saving new user to database...');
        await user.save();
        console.log('✅ New user saved successfully');

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save();

        res.cookie('refreshToken', refreshToken, {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.status(201).json(new ApiResponse(201, {
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                provider: user.provider,
                isVerified: user.isVerified,
                phoneVerified: user.phoneVerified,
                emailVerified: user.emailVerified,
                aadhaarVerified: user.aadhaarVerified,
                isProfileComplete: user.isProfileComplete()
            },
            accessToken,
            refreshToken,
            isNewUser: true
        }, "Google account created successfully"));
    } catch (error) {
        console.error('❌ Error in Google auth:', error);
        throw error;
    }
});

export const adminLogin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new ApiError(400, "Email and password are required");
    }

    const user = await User.findOne({ email, role: 'admin' }).select('+password');
    if (!user || !await user.isPasswordCorrect(password)) {
        throw new ApiError(401, "Invalid admin credentials");
    }

    if (user.isBanned) {
        throw new ApiError(403, "Admin account is banned");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie('refreshToken', refreshToken, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json(new ApiResponse(200, {
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            provider: user.provider,
            isVerified: user.isVerified,
            phoneVerified: user.phoneVerified,
            emailVerified: user.emailVerified,
            aadhaarVerified: user.aadhaarVerified
        },
        accessToken,
        refreshToken
    }, "Admin login successful"));
});

export const refreshToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Refresh token is required");
    }

    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findOne({ _id: decoded._id, refreshToken: incomingRefreshToken });

    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.refreshToken = newRefreshToken;
    await user.save();

    res.cookie('refreshToken', newRefreshToken, {
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json(new ApiResponse(200, {
        accessToken,
        refreshToken: newRefreshToken
    }, "Token refreshed successfully"));
});

export const logout = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (incomingRefreshToken) {
        // Invalidate refresh token in database
        await User.findOneAndUpdate(
            { refreshToken: incomingRefreshToken },
            { refreshToken: null }
        );
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.status(200).json(new ApiResponse(200, {}, "Logout successful"));
});

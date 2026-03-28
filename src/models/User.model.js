import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: function() {
            return this.provider === 'LOCAL';
        },
        select: false
    },
    role: {
        type: String,
        required: true,
        enum: ['farmer', 'buyer', 'logistics', 'admin'],
        index: true
    },
    provider: {
        type: String,
        required: true,
        enum: ['LOCAL', 'GOOGLE'],
        default: 'LOCAL'
    },
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    refreshToken: {
        type: String,
        select: false
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    phone: {
        type: String,
        sparse: true,
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    emailVerified: {
        type: Boolean,
        default: false
    },
    aadhaar: {
        type: String,
        sparse: true
    },
    aadhaarVerified: {
        type: Boolean,
        default: false
    },
    avatar: {
        type: String,
        default: ""
    },
    universal_role_id: {
        type: String,
        unique: true,
        sparse: true
    },
    profileId: {
        type: String,
        unique: true,
        sparse: true,
        default: function() {
            return `${this.role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
    },
    emailOTP: {
        type: String,
        select: false
    },
    emailOTPExpires: {
        type: Date,
        select: false
    },
    aadhaarOTP: {
        type: String,
        select: false
    },
    aadhaarOTPExpires: {
        type: Date,
        select: false
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other']
    },
    address: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    pincode: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

userSchema.pre("save", async function(next) {
    if (!this.isModified("password") || !this.password) return next();
    
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

userSchema.methods.isPasswordCorrect = async function(password) {
    if (!password || !this.password) {
        return false;
    }
    return await bcrypt.compare(String(password), String(this.password));
};

userSchema.methods.generateAccessToken = function() {
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('ACCESS_TOKEN_SECRET or JWT_SECRET not configured');
    }
    const payload = {
        _id: this._id,
        role: this.role,
        email: this.email,
        isVerified: this.isVerified
    };
    
    return jwt.sign(payload, secret, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m"
    });
};

userSchema.methods.generateRefreshToken = function() {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret) {
        throw new Error('REFRESH_TOKEN_SECRET not configured');
    }
    const payload = {
        _id: this._id
    };
    
    return jwt.sign(payload, secret, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d"
    });
};

userSchema.methods.generateUniversalRoleId = function() {
    return `${this.role}-${Date.now()}`;
};

userSchema.methods.isFullyVerified = function() {
    return this.emailVerified && this.aadhaarVerified;
};

userSchema.methods.isProfileComplete = function() {
    return this.emailVerified && this.aadhaarVerified;
};

const User = mongoose.model("User", userSchema);
export default User;
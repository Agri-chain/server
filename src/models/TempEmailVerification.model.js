import mongoose from 'mongoose';

const tempEmailVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    otpExpiry: {
        type: Date,
        required: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Auto delete after 1 hour
    }
});

const TempEmailVerification = mongoose.model('TempEmailVerification', tempEmailVerificationSchema);

export default TempEmailVerification;

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { generalLimiter, authLimiter, otpLimiter, passwordResetLimiter, deleteAccountLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { connectDB } from "./db/index.js";
import authRoutes from "./routes/auth.routes.js";
import otpRoutes from "./routes/otp.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import walletRoutes from "./routes/wallet.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import ApiError from "./utils/ApiError.js";

dotenv.config();

const app = express();

// Health check FIRST (always works)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        env: process.env.NODE_ENV,
        mongo: process.env.MONGODB_URI ? 'configured' : 'missing',
        timestamp: new Date().toISOString() 
    });
});

// Simple test endpoint - no DB
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working', time: new Date().toISOString() });
});

// Test auth endpoint - no DB
app.get('/api/v1/auth/test', (req, res) => {
    res.json({ message: 'Auth route is working', time: new Date().toISOString() });
});

// Check critical env vars
const missingEnv = [];
if (!process.env.MONGODB_URI) missingEnv.push('MONGODB_URI');
if (!process.env.JWT_SECRET) missingEnv.push('JWT_SECRET');

if (missingEnv.length > 0) {
    console.error('❌ Missing env vars:', missingEnv);
}

// Connect to DB (non-blocking)
if (process.env.MONGODB_URI) {
    connectDB().catch(err => {
        console.error('DB error:', err.message);
    });
}

// CORS configuration
const allowedOrigins = [
    process.env.CLIENT_URL,
    'https://smartkissan.vercel.app',
    'https://smartkissann.vercel.app',
    'http://localhost:5174',
    'http://localhost:5173'
].filter(Boolean);

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(allowed => origin.includes(allowed))) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// Data sanitization
app.use(mongoSanitize());

// Body parsing middleware
app.use(express.json({ limit: '10kb' })); // Reduced limit for security
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Rate limiting
app.use('/api/v1', generalLimiter);

// Routes with specific rate limiting
console.log('Mounting auth routes...', typeof authRoutes);
app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/otp/email/send", otpLimiter); // Extra strict for OTP sending
app.use("/api/v1/otp/password-reset/send", passwordResetLimiter);
app.use("/api/v1/otp/delete-account/request", deleteAccountLimiter);
app.use("/api/v1/otp/delete-account/confirm", deleteAccountLimiter);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/wallet", walletRoutes);
app.use("/api/v1/payment", paymentRoutes);

console.log('All routes mounted successfully');

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        statusCode: 404,
        success: false,
        message: "Route not found"
    });
});

// Global error handler
app.use(errorHandler);

export default app;

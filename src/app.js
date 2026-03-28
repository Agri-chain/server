import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./db/index.js";
import authRoutes from "./routes/auth.routes.js";
import otpRoutes from "./routes/otp.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import adminRoutes from "./routes/admin.routes.js";
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

app.use(cors({
    origin: [process.env.CLIENT_URL, "http://localhost:5174", "http://localhost:5173"].filter(Boolean),
    credentials: true
}));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));
app.use(cookieParser());

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        statusCode: 404,
        success: false,
        message: "Route not found"
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(err);
    }

    res.status(500).json({
        statusCode: 500,
        success: false,
        message: err.message || "Internal server error",
        timestamp: new Date().toISOString()
    });
});

export default app;

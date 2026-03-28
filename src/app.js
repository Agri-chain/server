import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db/index.js";
import authRoutes from "./routes/auth.routes.js";
import otpRoutes from "./routes/otp.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ApiError from "./utils/ApiError.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Check critical env vars
if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set');
}
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET not set');
}

// Connect to DB without top-level await
connectDB().catch(err => {
    console.error('⚠️ DB connection failed on startup:', err.message);
});

app.use(cors({
    origin: [process.env.CLIENT_URL, "http://localhost:5174", "http://localhost:5173"].filter(Boolean),
    credentials: true
}));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));
app.use(cookieParser());

// Health check endpoint (for Vercel)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

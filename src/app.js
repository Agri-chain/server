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
import ApiError from "./utils/ApiError.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

connectDB();

app.use(cors({
    origin: [`${process.env.CLIENT_URL}`, "http://localhost:5174", "http://localhost:5173"],
    credentials: true
}));

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));
app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/profile", profileRoutes);

app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(err);
    }

    res.status(500).json({
        statusCode: 500,
        success: false,
        message: "Internal server error",
        timestamp: new Date().toISOString()
    });
});

export default app;

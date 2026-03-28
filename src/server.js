import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import app from "./app.js";

dotenv.config();

// Connect to DB (non-blocking for serverless)
connectDB().catch(err => {
    console.error('DB init error:', err.message);
});

// Export for Vercel
export default app;

import dotenv from "dotenv";
import { connectDB } from "./db/index.js";
import app from "./app.js";

dotenv.config();

connectDB();

// For Vercel serverless - export the app
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 8000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

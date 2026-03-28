import mongoose from "mongoose";

// Global cache for serverless environment
let cachedConnection = null;

export const connectDB = async () => {
    try {
        // Check if already connected (Vercel serverless optimization)
        if (mongoose.connection.readyState >= 1) {
            console.log('✅ MongoDB already connected');
            return;
        }
        
        // Use cached connection if available
        if (cachedConnection) {
            console.log('✅ Using cached MongoDB connection');
            return cachedConnection;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
            retryWrites: true,
            w: 'majority',
        });
        
        cachedConnection = conn;
        console.log(`✅ MongoDB Connected: ${conn.connection.host || 'MongoDB Atlas'}`);
        console.log(`📊 Database: ${conn.connection.name || 'Agri-chain'}`);
        
        return conn;
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        cachedConnection = null;
        throw error;
    }
};

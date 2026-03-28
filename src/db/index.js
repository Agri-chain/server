import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        // Check if already connected (Vercel serverless optimization)
        if (mongoose.connection.readyState >= 1) {
            console.log('✅ MongoDB already connected');
            return;
        }

        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host || 'MongoDB Atlas'}`);
        console.log(`📊 Database: ${conn.connection.name || 'Agri-chain'}`);
        
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
        // Don't exit - let the function continue and return error response
        throw error;
    }
};

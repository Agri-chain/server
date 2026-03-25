import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: function() { return this.provider === 'LOCAL'; } },
    role: { type: String, required: true, enum: ['farmer', 'buyer', 'logistics', 'admin'] },
    provider: { type: String, required: true, enum: ['LOCAL', 'GOOGLE'], default: 'LOCAL' },
    googleId: { type: String, sparse: true, unique: true },
    phone: { type: String, sparse: true },
    phoneVerified: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: true },
    aadhaar: { type: String, sparse: true, unique: true },
    aadhaarVerified: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    avatar: { type: String, default: "" },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    pincode: { type: String, trim: true }
}, { timestamps: true });

userSchema.pre("save", async function(next) {
    if (!this.isModified("password") || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = mongoose.model('User', userSchema);

const createAdminUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const adminEmail = 'team.aditya.invincible@gmail.com';
        const adminPassword = 'Admin@123';

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('Admin user already exists');
            // Update admin to ensure all fields are correct
            existingAdmin.name = 'Admin Team Invincible';
            existingAdmin.role = 'admin';
            existingAdmin.phone = '9876543210';
            existingAdmin.emailVerified = true;
            existingAdmin.isVerified = true;
            if (!existingAdmin.password) {
                existingAdmin.password = adminPassword;
            }
            await existingAdmin.save();
            console.log('Admin user updated');
            console.log('Email:', adminEmail);
            console.log('Password:', adminPassword);
            process.exit(0);
        }

        // Create admin user
        const adminUser = new User({
            name: 'Admin Team Invincible',
            email: adminEmail,
            password: adminPassword,
            role: 'admin',
            phone: '9876543210',
            phoneVerified: false,
            emailVerified: true,
            isVerified: true,
            provider: 'LOCAL'
        });

        await adminUser.save();
        console.log('Admin user created successfully!');
        console.log('Email:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('Role: admin');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();

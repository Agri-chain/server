# Dual Authentication Backend

## To run the project -
npm i 
npm run dev 
IN both Client and server 


Dual authentication system with role-based access control following BACKEND_ANALYSIS.md architecture.

## 📋 Features

### Authentication
- **Dual Auth**: Google OAuth + Manual (email/password)
- **Roles**: Farmer, Buyer, Logistics, Admin (pre-registered)
- **JWT System**: Access token (15m) + Refresh token (7d)
- **Admin Authentication**: Separate admin login endpoint

### Profile Completion
- **Phone OTP**: SMS verification (simulated)
- **Email OTP**: Nodemailer integration
- **Aadhaar Verification**: Simulated verification
- **Verification Status**: Track email, phone, aadhaar verification

### Access Control
- **Unverified Users**: View only access
- **Verified Users**: Full access based on role
- **Role-Based Endpoints**: Different dashboards per role
- **Password Reset**: Email OTP based

## 🏗️ Project Structure

```
server/
├── src/
│   ├── server.js              # Server entry point
│   ├── app.js                 # Express app configuration
│   ├── db/
│   │   └── index.js          # Database connection
│   ├── models/
│   │   └── User.model.js     # User schema with dual auth
│   ├── controllers/
│   │   ├── auth.controller.js # Authentication logic
│   │   ├── otp.controller.js  # OTP verification
│   │   └── profile.controller.js # Profile management
│   ├── routes/
│   │   ├── auth.routes.js    # Auth endpoints
│   │   ├── otp.routes.js     # OTP endpoints
│   │   └── profile.routes.js # Profile endpoints
│   ├── middlewares/
│   │   └── auth.middleware.js # JWT & role verification
│   └── utils/
│       ├── asyncHandler.js    # Async wrapper
│       ├── ApiError.js       # Error class
│       ├── ApiResponse.js    # Response class
│       └── mail.js          # Email service
├── package.json
├── .env.example
└── README.md
```

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start Server**
   ```bash
   npm run dev
   ```

## 📊 API Endpoints

### Authentication (`/api/v1/auth`)
- `POST /register` - Manual registration
- `POST /login` - Manual login
- `POST /google-auth` - Google authentication
- `POST /admin/login` - Admin login
- `POST /refresh-token` - Token refresh
- `POST /logout` - Logout
- `GET /verify-token` - Token verification

### OTP (`/api/v1/otp`)
- `POST /email/send` - Send email OTP
- `POST /email/verify` - Verify email OTP
- `POST /phone/send` - Send phone OTP
- `POST /phone/verify` - Verify phone OTP
- `POST /password-reset/send` - Send password reset OTP
- `POST /password-reset/verify` - Verify password reset OTP

### Profile (`/api/v1/profile`)
- `GET /` - Get user profile
- `POST /complete` - Complete profile (phone, aadhaar)
- `PUT /update` - Update profile
- `POST /verify-aadhaar` - Verify Aadhaar

## 🔐 Security Features

- **Password Hashing**: bcrypt with 10 rounds
- **JWT Security**: Access/refresh token pattern
- **Role-Based Access**: Authorization middleware
- **OTP Verification**: Email and phone verification
- **Input Validation**: Comprehensive validation
- **Secure Cookies**: HttpOnly, SameSite configuration

## 🎯 Access Control Matrix

| Status | View | Buy | Sell | Admin |
|--------|------|-----|------|-------|
| Unverified | ✅ | ❌ | ❌ | ❌ |
| Verified | ✅ | ✅ | ✅ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ |

## 📝 Implementation Notes

- **Follows BACKEND_ANALYSIS.md** strictly
- **MVC Architecture** with service layer
- **Role-Based Authorization** middleware
- **Database Optimized** with indexes
- **Error Handling** with ApiError/ApiResponse
- **Environment Configured** for development

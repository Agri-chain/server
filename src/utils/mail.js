import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    }
});

export const sendEmailOTP = async (email, otp, subject = "Verification OTP") => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">${subject}</h2>
                <p>Your verification OTP is:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This OTP will expire in 5 minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

export const sendPasswordResetEmail = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Password Reset OTP",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset</h2>
                <p>Your password reset OTP is:</p>
                <div style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This OTP will expire in 5 minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this password reset, please secure your account immediately.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
};

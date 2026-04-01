import express from "express";
import {
  createOrder,
  createOrderForSend,
  verifyPayment,
  verifyPaymentForSend,
  getPaymentDetails,
  getRazorpayKey,
  webhookHandler
} from "../controllers/razorpay.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public route for Razorpay key
router.get("/key", getRazorpayKey);

// Webhook route (no auth required)
router.post("/webhook", webhookHandler);

// Protected routes
router.use(verifyToken);

// Payment routes for adding money
router.post("/create-order", createOrder);
router.post("/verify", verifyPayment);

// Payment routes for sending money
router.post("/create-order-send", createOrderForSend);
router.post("/verify-send", verifyPaymentForSend);

// Get payment details
router.get("/details/:paymentId", getPaymentDetails);

export default router;

import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/Payment.model.js";
import UserWallet from "../models/UserWallet.model.js";
import mongoose from "mongoose";

// Initialize Razorpay (you'll add API keys later)
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "your_key_id",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "your_key_secret"
  });
} catch (error) {
  console.warn("Razorpay initialization failed:", error.message);
  // Create a mock instance for development
  razorpay = {
    orders: {
      create: async () => ({ id: "mock_order_id", amount: 0 })
    },
    payments: {
      fetch: async () => ({ status: "captured" })
    }
  };
}

// Create Razorpay order for adding money to wallet
export const createOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user._id;

    // Check if Razorpay keys are configured
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "your_key_id" ||
        !process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === "your_key_secret") {
      return res.status(500).json({
        success: false,
        message: "Razorpay not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env file"
      });
    }

    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Amount must be at least ₹1"
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `w${userId.toString().slice(-6)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: userId.toString(),
        type: "wallet_add",
        description: "Add money to wallet"
      }
    };

    const order = await razorpay.orders.create(options);

    // Create pending payment record
    const payment = new Payment({
      payer: userId,
      amount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)),
      type: "wallet_add",
      payment_method: "razorpay",
      status: "pending",
      razorpay_order_id: order.id,
      description: `Adding ₹${amount} to wallet`
    });

    await payment.save();

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "your_key_id",
      paymentId: payment._id
    });
  } catch (error) {
    console.error("Create order error:", error);
    console.error("Error details:", {
      statusCode: error.statusCode,
      error: error.error,
      message: error.message,
      keyId: process.env.RAZORPAY_KEY_ID ? "Set" : "Not set",
      keySecret: process.env.RAZORPAY_KEY_SECRET ? "Set" : "Not set"
    });
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.error?.description || error.message
    });
  }
};

// Verify payment and add money to wallet
export const verifyPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature
    } = req.body;

    const userId = req.user._id;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "your_key_secret")
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    if (paymentDetails.status !== "captured") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Payment not captured"
      });
    }

    const amount = paymentDetails.amount / 100; // Convert from paise

    // Find and update payment record
    const payment = await Payment.findOne({
      razorpay_order_id: razorpay_order_id,
      payer: userId,
      status: "pending"
    }).session(session);

    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Payment record not found"
      });
    }

    payment.status = "completed";
    payment.razorpay_payment_id = razorpay_payment_id;
    payment.razorpay_signature = razorpay_signature;
    await payment.save({ session });

    // Update wallet balance
    const wallet = await UserWallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }

    const currentBalance = parseFloat(wallet.balance_inr.toString());
    wallet.balance_inr = mongoose.Types.Decimal128.fromString(
      (currentBalance + amount).toFixed(2)
    );

    const totalDeposited = parseFloat(wallet.totalDeposited.toString());
    wallet.totalDeposited = mongoose.Types.Decimal128.fromString(
      (totalDeposited + amount).toFixed(2)
    );

    await wallet.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Payment verified and money added to wallet",
      amount: amount,
      balance: wallet.balance_inr,
      payment: payment
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Verify payment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Get payment details
export const getPaymentDetails = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findOne({
      _id: paymentId,
      $or: [{ payer: userId }, { payee: userId }]
    }).populate("payer", "name email")
      .populate("payee", "name email");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found"
      });
    }

    res.status(200).json({
      success: true,
      payment
    });
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get payment details"
    });
  }
};

// Get Razorpay key ID (public key for frontend)
export const getRazorpayKey = async (req, res) => {
  res.status(200).json({
    success: true,
    keyId: process.env.RAZORPAY_KEY_ID || "your_key_id"
  });
};

// Create Razorpay order for sending money to another user
export const createOrderForSend = async (req, res) => {
  try {
    const { amount, recipientUpiId, note } = req.body;
    const userId = req.user._id;

    if (!amount || amount < 1) {
      return res.status(400).json({
        success: false,
        message: "Amount must be at least ₹1"
      });
    }

    if (!recipientUpiId || !recipientUpiId.includes('@')) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid recipient UPI ID"
      });
    }

    // Find recipient wallet by UPI ID
    const recipientWallet = await UserWallet.findOne({ upi_id: recipientUpiId });
    if (!recipientWallet) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found with this UPI ID"
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `s${userId.toString().slice(-6)}_${Date.now().toString().slice(-8)}`,
      notes: {
        userId: userId.toString(),
        recipientUpiId: recipientUpiId,
        recipientUserId: recipientWallet.user.toString(),
        type: "wallet_send",
        description: note || `Send money to ${recipientUpiId}`
      }
    };

    const order = await razorpay.orders.create(options);

    // Create pending payment record
    const payment = new Payment({
      payer: userId,
      payee: recipientWallet.user,
      recipientUpiId: recipientUpiId,
      amount: mongoose.Types.Decimal128.fromString(amount.toFixed(2)),
      type: "wallet_send",
      payment_method: "razorpay",
      status: "pending",
      razorpay_order_id: order.id,
      description: note || `Send ₹${amount} to ${recipientUpiId}`
    });

    await payment.save();

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "your_key_id",
      paymentId: payment._id
    });
  } catch (error) {
    console.error("Create order for send error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
      error: error.message
    });
  }
};

// Verify payment for sending money and credit recipient
export const verifyPaymentForSend = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      recipientUpiId,
      amount,
      note
    } = req.body;

    const userId = req.user._id;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "your_key_secret")
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature"
      });
    }

    // Fetch payment details from Razorpay
    const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);

    if (paymentDetails.status !== "captured") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Payment not captured"
      });
    }

    const paymentAmount = paymentDetails.amount / 100; // Convert from paise

    // Find recipient wallet
    const recipientWallet = await UserWallet.findOne({ upi_id: recipientUpiId }).session(session);
    if (!recipientWallet) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Recipient not found"
      });
    }

    // Update sender's payment record
    const senderPayment = await Payment.findOne({
      razorpay_order_id: razorpay_order_id,
      payer: userId,
      status: "pending"
    }).session(session);

    if (senderPayment) {
      senderPayment.status = "completed";
      senderPayment.razorpay_payment_id = razorpay_payment_id;
      senderPayment.razorpay_signature = razorpay_signature;
      await senderPayment.save({ session });
    }

    // Credit recipient's wallet
    const currentRecipientBalance = parseFloat(recipientWallet.balance_inr.toString());
    recipientWallet.balance_inr = mongoose.Types.Decimal128.fromString(
      (currentRecipientBalance + paymentAmount).toFixed(2)
    );

    const totalReceived = parseFloat(recipientWallet.totalReceived.toString());
    recipientWallet.totalReceived = mongoose.Types.Decimal128.fromString(
      (totalReceived + paymentAmount).toFixed(2)
    );

    await recipientWallet.save({ session });

    // Create receive transaction for recipient
    const receivePayment = new Payment({
      payer: userId,
      payee: recipientWallet.user,
      recipientUpiId: recipientUpiId,
      amount: mongoose.Types.Decimal128.fromString(paymentAmount.toFixed(2)),
      type: "wallet_receive",
      payment_method: "razorpay",
      status: "completed",
      razorpay_order_id: razorpay_order_id,
      razorpay_payment_id: razorpay_payment_id,
      description: note || `Received ₹${paymentAmount} via Razorpay`
    });

    await receivePayment.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Payment verified and money sent successfully",
      amount: paymentAmount,
      recipient: recipientUpiId,
      payment: senderPayment || receivePayment
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Verify payment for send error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment",
      error: error.message
    });
  } finally {
    session.endSession();
  }
};

// Handle Razorpay webhook
export const webhookHandler = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "your_webhook_secret";
    const signature = req.headers["x-razorpay-signature"];

    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = req.body;

    if (event.event === "payment.captured") {
      const { order_id, id: payment_id } = event.payload.payment.entity;

      // Update payment status
      await Payment.findOneAndUpdate(
        { razorpay_order_id: order_id },
        {
          status: "completed",
          razorpay_payment_id: payment_id
        }
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
};

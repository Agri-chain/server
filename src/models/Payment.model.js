import { mongoose, Schema } from "mongoose";
import User from "./User.model.js";

const PaymentSchema = new mongoose.Schema(
  {
    escrow: {
      type: Schema.Types.ObjectId,
      ref: "EscrowContract",
      required: false,
      index: true,
    },
    payer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
    },
    recipientUpiId: {
      type: String,
      trim: true,
    },
    amount: {
      type: mongoose.Types.Decimal128,
      required: true,
      default: 0.0,
      get: (v) => parseFloat(v.toString()),
    },
    type: {
      type: String,
      enum: ["escrow", "wallet_add", "wallet_withdraw", "wallet_send", "wallet_receive"],
      required: true,
      default: "escrow",
    },
    payment_method: {
      type: String,
      enum: ["upi", "crypto", "razorpay", "bank_transfer", "wallet"],
      required: true,
      default: "upi",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
      required: true,
    },
    upi_transaction_id: {
      type: String,
      trim: true,
    },
    razorpay_order_id: {
      type: String,
      trim: true,
    },
    razorpay_payment_id: {
      type: String,
      trim: true,
    },
    razorpay_signature: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  { 
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Index for faster queries
PaymentSchema.index({ payer: 1, createdAt: -1 });
PaymentSchema.index({ payee: 1, createdAt: -1 });
PaymentSchema.index({ type: 1, status: 1 });
PaymentSchema.index({ razorpay_order_id: 1 });

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;

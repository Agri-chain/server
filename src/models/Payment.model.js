import { mongoose, Schema } from "mongoose";
import EscrowContract from "./EscrowContract.model.js";
import User from "./User.model.js";

const PaymentSchema = new mongoose.Schema(
  {
    escrow: {
      type: Schema.Types.ObjectId,
      ref: "EscrowContract",
      required: true,
      index: true,
    },
    payer: {
      type: Schema.Types.ObjectId,
      ref: "User", // host
      required: true,
      index: true,
    },
    payee: {
      type: Schema.Types.ObjectId,
      ref: "User", //gig, organizer
      required: true,
      index: true,
    },
    amount: {
      type: mongoose.Types.Decimal128,
      required: true,
      default : 0.0,
    },

    payment_method: {
      type: String,
      enum: ["upi", "crypto"],
      required: true,
      default :"upi",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
      required: true,
    },
    upi_transaction_id: {
      type: String,
      trim: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const Payment = mongoose.model("Payment", PaymentSchema);
export default Payment;

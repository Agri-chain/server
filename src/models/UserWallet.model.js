import { mongoose, Schema } from "mongoose";
import User from "./User.model.js";

const BankAccountSchema = new mongoose.Schema({
  bankName: {
    type: String,
    required: true,
    trim: true,
  },
  accountNumber: {
    type: String,
    required: true,
    trim: true,
  },
  ifscCode: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
  },
  accountHolderName: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
}, { _id: true });

const UserWalletSchema = new mongoose.Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },

    upi_id: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    balance_inr: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString("0.00"),
      get: (v) => parseFloat(v.toString()),
    },

    bankAccounts: [BankAccountSchema],

    totalDeposited: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0.00"),
      get: (v) => parseFloat(v.toString()),
    },

    totalWithdrawn: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0.00"),
      get: (v) => parseFloat(v.toString()),
    },

    totalSent: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0.00"),
      get: (v) => parseFloat(v.toString()),
    },

    totalReceived: {
      type: mongoose.Schema.Types.Decimal128,
      default: () => mongoose.Types.Decimal128.fromString("0.00"),
      get: (v) => parseFloat(v.toString()),
    },
  },
  { 
    timestamps: { createdAt: true, updatedAt: true },
    toJSON: { getters: true },
    toObject: { getters: true }
  }
);

// Create wallet for user if not exists
UserWalletSchema.statics.getOrCreate = async function(userId) {
  let wallet = await this.findOne({ user: userId });
  if (!wallet) {
    wallet = await this.create({ user: userId });
  }
  return wallet;
};

const UserWallet = mongoose.model("UserWallet", UserWalletSchema);
export default UserWallet;

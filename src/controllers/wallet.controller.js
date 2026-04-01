import UserWallet from "../models/UserWallet.model.js";
import Payment from "../models/Payment.model.js";
import User from "../models/User.model.js";
import mongoose from "mongoose";

// Get wallet details
export const getWallet = async (req, res) => {
  try {
    const userId = req.user._id;
    const wallet = await UserWallet.getOrCreate(userId);
    
    res.status(200).json({
      success: true,
      wallet: {
        balance: wallet.balance_inr,
        upiId: wallet.upi_id,
        bankAccounts: wallet.bankAccounts,
        totalDeposited: wallet.totalDeposited,
        totalWithdrawn: wallet.totalWithdrawn,
        totalSent: wallet.totalSent,
        totalReceived: wallet.totalReceived,
      }
    });
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({ success: false, message: "Failed to get wallet" });
  }
};

// Add bank account
export const addBankAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { bankName, accountNumber, ifscCode, accountHolderName } = req.body;

    // Validation
    if (!bankName || !accountNumber || !ifscCode || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // IFSC code validation (basic)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(ifscCode.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid IFSC code format"
      });
    }

    const wallet = await UserWallet.getOrCreate(userId);

    // Check if account already exists
    const accountExists = wallet.bankAccounts.some(
      acc => acc.accountNumber === accountNumber && acc.ifscCode === ifscCode.toUpperCase()
    );

    if (accountExists) {
      return res.status(400).json({
        success: false,
        message: "Bank account already exists"
      });
    }

    // Add new bank account
    const newAccount = {
      bankName,
      accountNumber,
      ifscCode: ifscCode.toUpperCase(),
      accountHolderName,
      isDefault: wallet.bankAccounts.length === 0, // First account is default
      isVerified: false
    };

    wallet.bankAccounts.push(newAccount);
    await wallet.save();

    res.status(201).json({
      success: true,
      message: "Bank account added successfully",
      bankAccount: newAccount
    });
  } catch (error) {
    console.error("Add bank account error:", error);
    res.status(500).json({ success: false, message: "Failed to add bank account" });
  }
};

// Get bank accounts
export const getBankAccounts = async (req, res) => {
  try {
    const userId = req.user._id;
    const wallet = await UserWallet.getOrCreate(userId);

    res.status(200).json({
      success: true,
      bankAccounts: wallet.bankAccounts
    });
  } catch (error) {
    console.error("Get bank accounts error:", error);
    res.status(500).json({ success: false, message: "Failed to get bank accounts" });
  }
};

// Delete bank account
export const deleteBankAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { accountId } = req.params;

    const wallet = await UserWallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const accountIndex = wallet.bankAccounts.findIndex(
      acc => acc._id.toString() === accountId
    );

    if (accountIndex === -1) {
      return res.status(404).json({ success: false, message: "Bank account not found" });
    }

    const wasDefault = wallet.bankAccounts[accountIndex].isDefault;
    wallet.bankAccounts.splice(accountIndex, 1);

    // If deleted account was default, set first remaining as default
    if (wasDefault && wallet.bankAccounts.length > 0) {
      wallet.bankAccounts[0].isDefault = true;
    }

    await wallet.save();

    res.status(200).json({
      success: true,
      message: "Bank account deleted successfully"
    });
  } catch (error) {
    console.error("Delete bank account error:", error);
    res.status(500).json({ success: false, message: "Failed to delete bank account" });
  }
};

// Set default bank account
export const setDefaultBankAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { accountId } = req.params;

    const wallet = await UserWallet.findOne({ user: userId });
    if (!wallet) {
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    // Reset all accounts to non-default
    wallet.bankAccounts.forEach(acc => {
      acc.isDefault = acc._id.toString() === accountId;
    });

    await wallet.save();

    res.status(200).json({
      success: true,
      message: "Default bank account updated"
    });
  } catch (error) {
    console.error("Set default bank account error:", error);
    res.status(500).json({ success: false, message: "Failed to update default account" });
  }
};

// Add money to wallet (after Razorpay payment)
export const addMoneyToWallet = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { amount, razorpayPaymentId, razorpayOrderId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const wallet = await UserWallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    // Convert Decimal128 to number for calculation
    const currentBalance = parseFloat(wallet.balance_inr.toString());
    const amountToAdd = parseFloat(amount);

    // Update wallet balance
    wallet.balance_inr = mongoose.Types.Decimal128.fromString(
      (currentBalance + amountToAdd).toFixed(2)
    );

    // Update total deposited
    const totalDeposited = parseFloat(wallet.totalDeposited.toString());
    wallet.totalDeposited = mongoose.Types.Decimal128.fromString(
      (totalDeposited + amountToAdd).toFixed(2)
    );

    await wallet.save({ session });

    // Create payment record
    const payment = new Payment({
      payer: userId,
      amount: mongoose.Types.Decimal128.fromString(amountToAdd.toFixed(2)),
      type: "wallet_add",
      payment_method: "razorpay",
      status: "completed",
      razorpay_payment_id: razorpayPaymentId,
      razorpay_order_id: razorpayOrderId,
      description: `Added ₹${amountToAdd} to wallet`
    });

    await payment.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Money added successfully",
      balance: wallet.balance_inr,
      payment: payment
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Add money error:", error);
    res.status(500).json({ success: false, message: "Failed to add money" });
  } finally {
    session.endSession();
  }
};

// Withdraw money from wallet
export const withdrawMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { amount, bankAccountId } = req.body;

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Invalid amount" });
    }

    const wallet = await UserWallet.findOne({ user: userId }).session(session);
    if (!wallet) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Wallet not found" });
    }

    const currentBalance = parseFloat(wallet.balance_inr.toString());
    const amountToWithdraw = parseFloat(amount);

    if (currentBalance < amountToWithdraw) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Find bank account
    const bankAccount = wallet.bankAccounts.id(bankAccountId);
    if (!bankAccount) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Bank account not found" });
    }

    // Update wallet balance
    wallet.balance_inr = mongoose.Types.Decimal128.fromString(
      (currentBalance - amountToWithdraw).toFixed(2)
    );

    // Update total withdrawn
    const totalWithdrawn = parseFloat(wallet.totalWithdrawn.toString());
    wallet.totalWithdrawn = mongoose.Types.Decimal128.fromString(
      (totalWithdrawn + amountToWithdraw).toFixed(2)
    );

    await wallet.save({ session });

    // Create payment record
    const payment = new Payment({
      payer: userId,
      amount: mongoose.Types.Decimal128.fromString(amountToWithdraw.toFixed(2)),
      type: "wallet_withdraw",
      payment_method: "bank_transfer",
      status: "completed",
      description: `Withdrawn ₹${amountToWithdraw} to bank account ${bankAccount.bankName}`,
      metadata: {
        bankAccountId: bankAccountId,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber
      }
    });

    await payment.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Withdrawal successful",
      balance: wallet.balance_inr,
      payment: payment
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Withdraw money error:", error);
    res.status(500).json({ success: false, message: "Failed to withdraw money" });
  } finally {
    session.endSession();
  }
};

// Send money to another user by UPI ID
export const sendMoney = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const senderId = req.user._id;
    const { recipientUpiId, amount, note } = req.body;

    if (!recipientUpiId || !amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: "Recipient UPI ID and valid amount are required" 
      });
    }

    // Find recipient by UPI ID
    const recipientWallet = await UserWallet.findOne({ upi_id: recipientUpiId }).session(session);
    if (!recipientWallet) {
      await session.abortTransaction();
      return res.status(404).json({ 
        success: false, 
        message: "Recipient not found with this UPI ID" 
      });
    }

    const recipientId = recipientWallet.user;

    // Cannot send to self
    if (recipientId.toString() === senderId.toString()) {
      await session.abortTransaction();
      return res.status(400).json({ 
        success: false, 
        message: "Cannot send money to yourself" 
      });
    }

    // Get sender wallet
    const senderWallet = await UserWallet.findOne({ user: senderId }).session(session);
    if (!senderWallet) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Sender wallet not found" });
    }

    const senderBalance = parseFloat(senderWallet.balance_inr.toString());
    const amountToSend = parseFloat(amount);

    if (senderBalance < amountToSend) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Insufficient balance" });
    }

    // Deduct from sender
    senderWallet.balance_inr = mongoose.Types.Decimal128.fromString(
      (senderBalance - amountToSend).toFixed(2)
    );
    const senderTotalSent = parseFloat(senderWallet.totalSent.toString());
    senderWallet.totalSent = mongoose.Types.Decimal128.fromString(
      (senderTotalSent + amountToSend).toFixed(2)
    );
    await senderWallet.save({ session });

    // Add to recipient
    const recipientBalance = parseFloat(recipientWallet.balance_inr.toString());
    recipientWallet.balance_inr = mongoose.Types.Decimal128.fromString(
      (recipientBalance + amountToSend).toFixed(2)
    );
    const recipientTotalReceived = parseFloat(recipientWallet.totalReceived.toString());
    recipientWallet.totalReceived = mongoose.Types.Decimal128.fromString(
      (recipientTotalReceived + amountToSend).toFixed(2)
    );
    await recipientWallet.save({ session });

    // Create payment records for both sender and recipient
    const senderPayment = new Payment({
      payer: senderId,
      payee: recipientId,
      recipientUpiId: recipientUpiId,
      amount: mongoose.Types.Decimal128.fromString(amountToSend.toFixed(2)),
      type: "wallet_send",
      payment_method: "wallet",
      status: "completed",
      description: note || `Sent ₹${amountToSend} to ${recipientUpiId}`
    });

    const recipientPayment = new Payment({
      payer: senderId,
      payee: recipientId,
      recipientUpiId: recipientUpiId,
      amount: mongoose.Types.Decimal128.fromString(amountToSend.toFixed(2)),
      type: "wallet_receive",
      payment_method: "wallet",
      status: "completed",
      description: note || `Received ₹${amountToSend} from wallet`
    });

    await senderPayment.save({ session });
    await recipientPayment.save({ session });
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Money sent successfully",
      balance: senderWallet.balance_inr,
      payment: senderPayment
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Send money error:", error);
    res.status(500).json({ success: false, message: "Failed to send money" });
  } finally {
    session.endSession();
  }
};

// Get transaction history
export const getTransactions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type } = req.query;

    const query = {
      $or: [{ payer: userId }, { payee: userId }]
    };

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("payer", "name email")
      .populate("payee", "name email");

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ success: false, message: "Failed to get transactions" });
  }
};

// Generate UPI ID for user
export const generateUpiId = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const wallet = await UserWallet.getOrCreate(userId);

    if (wallet.upi_id) {
      return res.status(200).json({
        success: true,
        upiId: wallet.upi_id,
        message: "UPI ID already exists"
      });
    }

    // Generate unique UPI ID
    const baseUpiId = `${user.email.split('@')[0]}@agrichain`;
    let upiId = baseUpiId;
    let counter = 1;

    while (await UserWallet.findOne({ upi_id: upiId })) {
      upiId = `${user.email.split('@')[0]}${counter}@agrichain`;
      counter++;
    }

    wallet.upi_id = upiId;
    await wallet.save();

    res.status(200).json({
      success: true,
      upiId: upiId,
      message: "UPI ID generated successfully"
    });
  } catch (error) {
    console.error("Generate UPI ID error:", error);
    res.status(500).json({ success: false, message: "Failed to generate UPI ID" });
  }
};

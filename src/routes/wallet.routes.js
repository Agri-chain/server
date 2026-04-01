import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  getWallet,
  addBankAccount,
  getBankAccounts,
  deleteBankAccount,
  setDefaultBankAccount,
  addMoneyToWallet,
  withdrawMoney,
  sendMoney,
  getTransactions,
  generateUpiId
} from "../controllers/wallet.controller.js";

const router = express.Router();

// All wallet routes require authentication
router.use(verifyToken);

// Wallet balance and details
router.get("/", getWallet);

// Bank account routes
router.post("/bank-account", addBankAccount);
router.get("/bank-accounts", getBankAccounts);
router.delete("/bank-account/:accountId", deleteBankAccount);
router.put("/bank-account/:accountId/default", setDefaultBankAccount);

// Wallet operations
router.post("/add-money", addMoneyToWallet);
router.post("/withdraw", withdrawMoney);
router.post("/send", sendMoney);
router.get("/transactions", getTransactions);

// UPI ID
router.post("/generate-upi", generateUpiId);

export default router;

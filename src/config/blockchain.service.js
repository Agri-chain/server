// src/services/blockchain.service.js
const { ethers } = require('ethers');
const blockchainConfig = require('../config/blockchain.config.js');

// Initialize provider and wallet
const provider = new ethers.providers.JsonRpcProvider(blockchainConfig.provider.localhost.url);
const wallet = new ethers.Wallet(blockchainConfig.networks.localhost.accounts[0], provider);

// Contract ABIs (Escrow contract from Solidity-Escrow-Service repo)
const ESCROW_ABI = [
  "function createTrade(address seller, uint256 amount, string memory orderId) external payable",
  "function releasePayment(uint256 tradeId) external",
  "function buyerConfirmDelivery(uint256 tradeId) external",
  "function refundBuyer(uint256 tradeId) external",
  "function getTrade(uint256 tradeId) view returns (address buyer, address seller, uint256 amount, bool paymentReleased, bool deliveryConfirmed, string memory orderId)",
  "function getTradeCount() view returns (uint256)",
  "event TradeCreated(uint256 indexed tradeId, address buyer, address seller, uint256 amount, string orderId)",
  "event PaymentReleased(uint256 indexed tradeId)",
  "event DeliveryConfirmed(uint256 indexed tradeId)"
];

class BlockchainService {
  constructor() {
    this.escrowContract = null;
    this.initContracts();
  }

  async initContracts() {
    const escrowAddress = blockchainConfig.contracts.EscrowContract;
    this.escrowContract = new ethers.Contract(escrowAddress, ESCROW_ABI, wallet);
    console.log(`✅ Connected to Escrow at ${escrowAddress}`);
  }

  // Create escrow trade for agri order
  async createEscrowTrade(sellerAddress, amountInWei, orderId) {
    try {
      const tx = await this.escrowContract.createTrade(sellerAddress, amountInWei, orderId, {
        value: amountInWei,
        gasLimit: blockchainConfig.gasSettings.gasLimit
      });
      
      const receipt = await tx.wait();
      const tradeId = receipt.events.find(e => e.event === 'TradeCreated')?.args?.tradeId;
      
      console.log(`✅ Escrow created: Trade ID ${tradeId} | Tx: ${tx.hash}`);
      return { success: true, tradeId: tradeId.toString(), txHash: tx.hash };
    } catch (error) {
      console.error('❌ Escrow creation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Buyer confirms delivery, releases payment to seller
  async confirmDelivery(tradeId) {
    try {
      const tx = await this.escrowContract.buyerConfirmDelivery(tradeId, {
        gasLimit: blockchainConfig.gasSettings.gasLimit
      });
      
      const receipt = await tx.wait();
      console.log(`✅ Delivery confirmed for trade ${tradeId} | Tx: ${tx.hash}`);
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('❌ Delivery confirmation failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Seller releases payment (alternative flow)
  async releasePayment(tradeId) {
    try {
      const tx = await this.escrowContract.releasePayment(tradeId, {
        gasLimit: blockchainConfig.gasSettings.gasLimit
      });
      
      const receipt = await tx.wait();
      console.log(`✅ Payment released for trade ${tradeId} | Tx: ${tx.hash}`);
      return { success: true, txHash: tx.hash };
    } catch (error) {
      console.error('❌ Payment release failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get trade details
  async getTradeDetails(tradeId) {
    try {
      const trade = await this.escrowContract.getTrade(tradeId);
      return {
        buyer: trade.buyer,
        seller: trade.seller,
        amount: ethers.utils.formatEther(trade.amount),
        paymentReleased: trade.paymentReleased,
        deliveryConfirmed: trade.deliveryConfirmed,
        orderId: trade.orderId
      };
    } catch (error) {
      console.error('❌ Failed to fetch trade:', error);
      return null;
    }
  }

  // Get total number of trades
  async getTradeCount() {
    try {
      const count = await this.escrowContract.getTradeCount();
      return count.toString();
    } catch (error) {
      console.error('❌ Failed to get trade count:', error);
      return '0';
    }
  }

  // Check wallet balance
  async getBalance(address) {
    try {
      const balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      return '0';
    }
  }
}

module.exports = new BlockchainService();
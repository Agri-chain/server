// src/services/blockchain.service.js
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

// Hardhat contract ABI (minimal for EscrowContract)
const ESCROW_ABI = [
  "function createTrade(address seller, uint256 amount, string memory orderId) external payable returns (uint256 tradeId)",
  "function confirmDelivery(uint256 tradeId) external",
  "function releasePayment(uint256 tradeId) external",
  "function getTrade(uint256 tradeId) external view returns (tuple(address buyer, address seller, uint256 amount, bool isDelivered, bool isPaid, string orderId))",
  "function tradeCount() external view returns (uint256)",
  "event TradeCreated(uint256 tradeId, address buyer, address seller, uint256 amount, string orderId)",
  "event DeliveryConfirmed(uint256 tradeId, address buyer)",
  "event PaymentReleased(uint256 tradeId, address seller, uint256 amount)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.escrowContract = null;
    this.init();
  }

  async init() {
    try {
      // Connect to Hardhat local network
      const providerUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://127.0.0.1:8545';
      this.provider = new ethers.JsonRpcProvider(providerUrl);

      // Get private key from env
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      if (!privateKey) {
        console.warn('⚠️  BLOCKCHAIN_PRIVATE_KEY not set - blockchain features disabled');
        return;
      }

      this.signer = new ethers.Wallet(privateKey, this.provider);

      // Contract address from env
      const contractAddress = process.env.ESCROW_CONTRACT_ADDRESS;
      if (!contractAddress) {
        console.warn('⚠️  ESCROW_CONTRACT_ADDRESS not set - blockchain features disabled');
        return;
      }

      this.escrowContract = new ethers.Contract(contractAddress, ESCROW_ABI, this.signer);
      
      console.log('✅ Blockchain service initialized');
      console.log('   Wallet:', this.signer.address);
      console.log('   Contract:', contractAddress);
    } catch (error) {
      console.error('❌ Blockchain init failed:', error.message);
      this.escrowContract = null;
    }
  }

  async getBalance(address) {
    if (!this.provider) return '0';
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Get balance error:', error);
      return '0';
    }
  }

  async getTradeCount() {
    if (!this.escrowContract) return 0;
    try {
      const count = await this.escrowContract.tradeCount();
      return Number(count);
    } catch (error) {
      console.error('Get trade count error:', error);
      return 0;
    }
  }

  async createEscrowTrade(sellerAddress, amountInWei, orderId) {
    if (!this.escrowContract) {
      return { success: false, error: 'Blockchain not connected' };
    }
    try {
      const tx = await this.escrowContract.createTrade(
        sellerAddress,
        amountInWei,
        orderId,
        { value: amountInWei }
      );
      const receipt = await tx.wait();
      
      // Parse tradeId from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = this.escrowContract.interface.parseLog(log);
          return parsed?.name === 'TradeCreated';
        } catch { return false; }
      });
      
      const tradeId = event ? 
        this.escrowContract.interface.parseLog(event).args.tradeId.toString() : 
        'unknown';

      return {
        success: true,
        tradeId,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('Create escrow error:', error);
      return { success: false, error: error.message };
    }
  }

  async confirmDelivery(tradeId) {
    if (!this.escrowContract) {
      return { success: false, error: 'Blockchain not connected' };
    }
    try {
      const tx = await this.escrowContract.confirmDelivery(tradeId);
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('Confirm delivery error:', error);
      return { success: false, error: error.message };
    }
  }

  async releasePayment(tradeId) {
    if (!this.escrowContract) {
      return { success: false, error: 'Blockchain not connected' };
    }
    try {
      const tx = await this.escrowContract.releasePayment(tradeId);
      const receipt = await tx.wait();
      return {
        success: true,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('Release payment error:', error);
      return { success: false, error: error.message };
    }
  }

  async getTradeDetails(tradeId) {
    if (!this.escrowContract) return null;
    try {
      const trade = await this.escrowContract.getTrade(tradeId);
      return {
        buyer: trade.buyer,
        seller: trade.seller,
        amount: ethers.formatEther(trade.amount),
        isDelivered: trade.isDelivered,
        isPaid: trade.isPaid,
        orderId: trade.orderId
      };
    } catch (error) {
      console.error('Get trade details error:', error);
      return null;
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

export default blockchainService;

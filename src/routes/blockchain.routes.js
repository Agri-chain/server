// src/routes/blockchain.routes.js
import express from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import blockchainService from '../services/blockchain.service.js';
import { ethers } from 'ethers';
import ApiError from '../utils/ApiError.js';

const router = express.Router();

// GET /api/v1/blockchain/status - Check blockchain connection & stats
router.get('/status', async (req, res, next) => {
  try {
    const balance = await blockchainService.getBalance(blockchainService.escrowContract?.signer.address);
    const tradeCount = await blockchainService.getTradeCount();
    
    res.json({
      success: true,
      data: {
        connected: !!blockchainService.escrowContract,
        wallet: blockchainService.escrowContract?.signer.address,
        balance: `${parseFloat(balance).toFixed(4)} ETH`,
        totalTrades: tradeCount,
        network: 'Hardhat Localhost (127.0.0.1:8545)'
      }
    });
  } catch (error) {
    next(new ApiError(500, 'Failed to get blockchain status', error.message));
  }
});

// POST /api/v1/blockchain/escrow/create - Create new escrow trade
router.post('/escrow/create', authLimiter, async (req, res, next) => {
  try {
    const { sellerAddress, amount, orderId } = req.body;
    
    if (!sellerAddress || !amount || !orderId) {
      return next(new ApiError(400, 'Missing required fields: sellerAddress, amount, orderId'));
    }

    const amountInWei = ethers.utils.parseEther(amount.toString());
    
    const result = await blockchainService.createEscrowTrade(sellerAddress, amountInWei, orderId);

    if (result.success) {
      res.status(201).json({
        success: true,
        data: {
          tradeId: result.tradeId,
          txHash: result.txHash,
          explorer: `http://localhost:8545/tx/${result.txHash}`,
          message: 'Escrow created successfully! Funds locked.'
        }
      });
    } else {
      next(new ApiError(500, 'Escrow creation failed', result.error));
    }
  } catch (error) {
    next(new ApiError(500, 'Escrow creation error', error.message));
  }
});

// POST /api/v1/blockchain/escrow/confirm-delivery - Buyer confirms delivery
router.post('/escrow/confirm-delivery', authLimiter, async (req, res, next) => {
  try {
    const { tradeId } = req.body;
    
    if (!tradeId) {
      return next(new ApiError(400, 'tradeId is required'));
    }

    const result = await blockchainService.confirmDelivery(tradeId);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          tradeId,
          txHash: result.txHash,
          explorer: `http://localhost:8545/tx/${result.txHash}`,
          message: 'Delivery confirmed! Payment released to seller ✅'
        }
      });
    } else {
      next(new ApiError(500, 'Delivery confirmation failed', result.error));
    }
  } catch (error) {
    next(new ApiError(500, 'Confirm delivery error', error.message));
  }
});

// POST /api/v1/blockchain/escrow/release-payment - Seller releases payment
router.post('/escrow/release-payment', authLimiter, async (req, res, next) => {
  try {
    const { tradeId } = req.body;
    
    if (!tradeId) {
      return next(new ApiError(400, 'tradeId is required'));
    }

    const result = await blockchainService.releasePayment(tradeId);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          tradeId,
          txHash: result.txHash,
          explorer: `http://localhost:8545/tx/${result.txHash}`,
          message: 'Payment released to buyer ✅'
        }
      });
    } else {
      next(new ApiError(500, 'Payment release failed', result.error));
    }
  } catch (error) {
    next(new ApiError(500, 'Release payment error', error.message));
  }
});

// GET /api/v1/blockchain/escrow/:tradeId - Get trade details
router.get('/escrow/:tradeId', async (req, res, next) => {
  try {
    const { tradeId } = req.params;
    
    const trade = await blockchainService.getTradeDetails(tradeId);
    
    if (!trade) {
      return next(new ApiError(404, 'Trade not found'));
    }

    res.json({
      success: true,
      data: trade
    });
  } catch (error) {
    next(new ApiError(500, 'Failed to fetch trade details', error.message));
  }
});

// GET /api/v1/blockchain/balance/:address - Check wallet balance
router.get('/balance/:address', async (req, res, next) => {
  try {
    const { address } = req.params;
    
    if (!ethers.utils.isAddress(address)) {
      return next(new ApiError(400, 'Invalid Ethereum address'));
    }

    const balance = await blockchainService.getBalance(address);
    
    res.json({
      success: true,
      data: {
        address,
        balance: `${parseFloat(balance).toFixed(6)} ETH`
      }
    });
  } catch (error) {
    next(new ApiError(500, 'Failed to check balance', error.message));
  }
});

export default router;
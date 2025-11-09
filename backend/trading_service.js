/**
 * Polymarket Builder Trading Service - HTTP Server
 *
 * Runs as HTTP server for reliable cross-platform communication.
 * Handles gasless trading through Polymarket's Builder program:
 * - Uses official @polymarket/clob-client with Builder attribution
 * - Integrates with signing server for secure header generation
 * - Supports gasless transactions via relayer
 * - Manages Safe wallet deployment and operations
 */

require('dotenv').config({ path: './.env', silent: true });
const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const NodeCache = require('node-cache');
const { ClobClient } = require('@polymarket/clob-client');
const { RelayClient } = require('@polymarket/builder-relayer-client');
const { BuilderConfig } = require('@polymarket/builder-signing-sdk');
const { ethers } = require('ethers');

// Initialize cache for market data (5 minute TTL)
const marketCache = new NodeCache({ stdTTL: 300 });

// Validation schemas
const orderSchema = Joi.object({
  marketId: Joi.string().required(),
  side: Joi.string().valid('buy', 'sell').required(),
  size: Joi.number().positive().max(10000).required(),
  price: Joi.number().min(0).max(1).required(),
  safeAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  outcome: Joi.string().valid('Yes', 'No', 'yes', 'no').required()
});

const safeDeploySchema = Joi.object({
  userPrivateKey: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required()
});

const usdcApprovalSchema = Joi.object({
  safeAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  amount: Joi.string().optional()
});

// Rate limiting
const tradingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many trading requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Express app
const app = express();
const PORT = process.env.TRADING_SERVICE_PORT || 5002;

// Middleware
app.use(express.json());
app.use('/place-order', tradingLimiter);
app.use('/deploy-safe', tradingLimiter);
app.use('/approve-usdc', tradingLimiter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);

  if (err.name === 'RelayerTimeout') {
    return res.status(503).json({
      success: false,
      error: 'Service busy—retrying transaction...',
      retryAfter: 5000
    });
  }

  if (err.name === 'InvalidMarket') {
    return res.status(400).json({
      success: false,
      error: 'Market inactive or invalid'
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid input parameters',
      details: err.details
    });
  }

  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Validation middleware
function validateSchema(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const validationError = new Error('ValidationError');
      validationError.details = error.details[0].message;
      return next(validationError);
    }
    next();
  };
}

// Configuration from environment
const POLYMARKET_API_KEY = process.env.POLYMARKET_API_KEY;
const POLYMARKET_SECRET = process.env.POLYMARKET_SECRET_KEY;
const POLYMARKET_PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;
const POLYMARKET_PRIVATE_KEY = process.env.POLYMARKET_PRIVATE_KEY;
const SIGNING_SERVER_URL = process.env.POLYMARKET_SIGNING_SERVER_URL || 'http://localhost:5001/sign';

// Only show debug output when running directly (not when called from Python)
if (require.main === module) {
  console.log('Environment variables loaded:');
  console.log('POLYMARKET_API_KEY:', POLYMARKET_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('POLYMARKET_SECRET:', POLYMARKET_SECRET ? '✅ Set' : '❌ Missing');
  console.log('POLYMARKET_PASSPHRASE:', POLYMARKET_PASSPHRASE ? '✅ Set' : '❌ Missing');
  console.log('POLYMARKET_PRIVATE_KEY:', POLYMARKET_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
  console.log('SIGNING_SERVER_URL:', SIGNING_SERVER_URL);
}

// Initialize clients
let clobClient = null;
let relayClient = null;

function initializeClients() {
  if (!clobClient) {
    try {
      // Builder config with remote signing server
      const builderConfig = new BuilderConfig({
        remoteBuilderConfig: {
          url: SIGNING_SERVER_URL
        }
      });

      // Initialize CLOB client with Builder attribution
      clobClient = new ClobClient(
        'https://clob.polymarket.com',
        POLYMARKET_PRIVATE_KEY,
        137, // Polygon chain ID
        builderConfig
      );

      console.log('✅ Initialized Polymarket CLOB client with Builder attribution');
    } catch (error) {
      console.error('❌ Failed to initialize CLOB client:', error.message);
      clobClient = null;
    }
  }

  if (!relayClient) {
    try {
      // Initialize provider for Polygon
      const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

      // Create wallet from private key (remove 0x prefix if present)
      const privateKey = POLYMARKET_PRIVATE_KEY.startsWith('0x')
        ? POLYMARKET_PRIVATE_KEY.slice(2)
        : POLYMARKET_PRIVATE_KEY;
      const wallet = new ethers.Wallet(privateKey, provider);

      // Initialize relay client for gasless transactions
      // Note: RelayClient doesn't need builder config, but we can pass it if needed
      relayClient = new RelayClient(
        'https://relayer-v2.polymarket.com/',
        137, // Polygon chain ID
        wallet
      );

      console.log('✅ Initialized Polymarket Relay client for gasless trading');
    } catch (error) {
      console.error('❌ Failed to initialize RelayClient:', error.message);
      console.log('⏭️ Continuing without RelayClient (Safe wallet features disabled)');
      relayClient = null;
    }
  }
}

/**
 * Deploy a Safe wallet for a user
 */
async function deploySafeWallet(userWalletAddress) {
  try {
    initializeClients();

    console.log(`Deploying Safe wallet for user: ${userWalletAddress}`);

    const response = await relayClient.deploySafe();
    const result = await response.wait();

    if (result && result.proxyAddress) {
      console.log(`✅ Safe wallet deployed: ${result.proxyAddress}`);
      return {
        success: true,
        safeAddress: result.proxyAddress,
        transactionHash: result.transactionHash
      };
    } else {
      throw new Error('Safe deployment failed - no proxy address returned');
    }

  } catch (error) {
    console.error('❌ Safe wallet deployment failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Approve USDC spending for Conditional Tokens Framework
 */
async function approveUSDC(safeAddress, amount = ethers.MaxUint256) {
  try {
    initializeClients();

    console.log(`Approving USDC for Safe: ${safeAddress}`);

    // USDC contract address on Polygon
    const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const spenderAddress = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045'; // CTF

    // Create approval transaction
    const iface = new ethers.Interface([
      'function approve(address spender, uint256 amount)'
    ]);

    const encodedApprove = iface.encodeFunctionData('approve', [spenderAddress, amount]);

    const safeTransaction = {
      to: usdcAddress,
      value: '0',
      data: encodedApprove,
      operation: 0 // CALL
    };

    const response = await relayClient.executeSafeTransactions([safeTransaction]);
    const result = await response.wait();

    console.log(`✅ USDC approval successful: ${result.transactionHash}`);
    return {
      success: true,
      transactionHash: result.transactionHash
    };

  } catch (error) {
    console.error('❌ USDC approval failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Place a trade order on Polymarket
 */
async function placeOrder(marketId, side, size, price) {
  try {
    initializeClients();

    console.log(`Placing ${side} order: ${size} @ ${price} on market ${marketId}`);

    // Create order object
    const order = {
      market: marketId,
      side: side.toUpperCase(), // 'BUY' or 'SELL'
      size: parseFloat(size),
      price: parseFloat(price)
    };

    // Create the order (this will automatically add Builder attribution headers)
    const createdOrder = await clobClient.createOrder(order);

    // Post the order to CLOB
    const response = await clobClient.postOrder(createdOrder);

    console.log(`✅ Order placed successfully:`, response);

    return {
      success: true,
      orderId: response.orderId || response.id,
      transactionHash: response.transactionHash,
      status: 'confirmed'
    };

  } catch (error) {
    console.error('❌ Order placement failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get market order book
 */
async function getOrderBook(marketId) {
  try {
    initializeClients();

    const orderBook = await clobClient.getOrderBook(marketId);

    return {
      success: true,
      orderBook: orderBook
    };

  } catch (error) {
    console.error('❌ Failed to get order book:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get market details from Gamma API (with caching)
 */
async function getMarketDetails(marketId) {
  try {
    // Check cache first
    const cached = marketCache.get(marketId);
    if (cached) {
      console.log(`📋 Using cached market data for ${marketId}`);
      return cached;
    }

    // Fetch from Gamma API
    const gammaUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
    const response = await fetch(gammaUrl);

    if (!response.ok) {
      throw new Error(`Gamma API returned ${response.status}`);
    }

    const market = await response.json();

    // Cache the result
    marketCache.set(marketId, market);
    console.log(`📥 Cached market data for ${marketId}`);

    return market;
  } catch (error) {
    console.error('❌ Failed to get market details:', error);
    throw error;
  }
}

/**
 * Place AMM order using CTF (for markets without CLOB)
 */
async function placeAMMOrder(safeAddress, marketId, side, size, price, outcome) {
  try {
    console.log(`Placing AMM ${side} order: ${size} ${outcome} @ ${price} via Safe ${safeAddress}`);

    // Get market details for condition ID and token IDs
    const marketDetails = await getMarketDetails(marketId);
    const conditionId = marketDetails.conditionId;
    const clobTokenIds = marketDetails.clobTokenIds || [];

    // Determine token ID based on outcome
    const outcomeIndex = outcome.toLowerCase() === 'yes' ? 0 : 1;
    const tokenId = clobTokenIds[outcomeIndex];

    if (!tokenId) {
      throw new Error(`No token ID found for outcome: ${outcome}`);
    }

    // Calculate collateral amount needed (price * size in USDC)
    const collateralAmount = Math.floor(price * size * 1e6); // USDC has 6 decimals

    // Create temporary RelayClient for this Safe
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const ownerPrivateKey = POLYMARKET_PRIVATE_KEY.startsWith('0x')
      ? POLYMARKET_PRIVATE_KEY.slice(2)
      : POLYMARKET_PRIVATE_KEY;
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);

    const safeRelayClient = new RelayClient(
      'https://relayer-v2.polymarket.com/',
      137, // Polygon chain ID
      ownerWallet
    );

    // CTF contract address on Polygon
    const ctfAddress = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';

    // For buying: split collateral into position tokens
    if (side.toLowerCase() === 'buy') {
      const iface = new ethers.Interface([
        'function splitPosition(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] partition, uint amount)'
      ]);

      // Partition for the specific outcome
      const partition = outcomeIndex === 0 ? [1, 0] : [0, 1];

      const splitData = iface.encodeFunctionData('splitPosition', [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        ethers.ZeroHash, // parentCollectionId (0x00...00 for root)
        conditionId,
        partition,
        collateralAmount
      ]);

      const safeTransaction = {
        to: ctfAddress,
        value: '0',
        data: splitData,
        operation: 0 // CALL
      };

      const response = await safeRelayClient.executeSafeTransactions([safeTransaction], safeAddress);
      const result = await response.wait();

      return {
        success: true,
        transactionHash: result.hash,
        type: 'amm_split',
        outcome: outcome,
        amount: collateralAmount,
        shares: size
      };
    }

    // For selling: merge position tokens back to collateral
    else if (side.toLowerCase() === 'sell') {
      const iface = new ethers.Interface([
        'function mergePositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] partition, uint amount)'
      ]);

      const partition = outcomeIndex === 0 ? [1, 0] : [0, 1];

      const mergeData = iface.encodeFunctionData('mergePositions', [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        ethers.ZeroHash,
        conditionId,
        partition,
        size // Number of shares to merge
      ]);

      const safeTransaction = {
        to: ctfAddress,
        value: '0',
        data: mergeData,
        operation: 0 // CALL
      };

      const response = await safeRelayClient.executeSafeTransactions([safeTransaction], safeAddress);
      const result = await response.wait();

      return {
        success: true,
        transactionHash: result.hash,
        type: 'amm_merge',
        outcome: outcome,
        shares: size
      };
    }

    throw new Error(`Unsupported side: ${side}`);

  } catch (error) {
    console.error('❌ AMM order placement failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get user's positions with P&L calculation
 */
async function getPositions(safeAddress) {
  try {
    initializeClients();

    console.log(`Getting positions for Safe: ${safeAddress}`);

    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

    // Get USDC balance
    const usdcContract = new ethers.Contract(
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      ['function balanceOf(address) view returns (uint256)'],
      provider
    );
    const usdcBalance = await usdcContract.balanceOf(safeAddress);

    // For now, return basic position structure
    // In production, you'd query CTF contract for all position tokens
    const positions = [];

    // Calculate basic P&L (placeholder)
    const pnl = 0;

    return {
      success: true,
      usdcBalance: ethers.formatUnits(usdcBalance, 6),
      positions: positions,
      pnl: pnl
    };

  } catch (error) {
    console.error('❌ Failed to get positions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Redeem positions back to USDC
 */
async function redeemPositions(safeAddress, tokenIds, amounts) {
  try {
    console.log(`Redeeming positions for Safe: ${safeAddress}`);

    // Create temporary RelayClient for this Safe
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const ownerPrivateKey = POLYMARKET_PRIVATE_KEY.startsWith('0x')
      ? POLYMARKET_PRIVATE_KEY.slice(2)
      : POLYMARKET_PRIVATE_KEY;
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);

    const safeRelayClient = new RelayClient(
      'https://relayer-v2.polymarket.com/',
      137, // Polygon chain ID
      ownerWallet
    );

    // CTF contract address on Polygon
    const ctfAddress = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';

    // For redemption: redeemPositions function
    const iface = new ethers.Interface([
      'function redeemPositions(address collateralToken, bytes32 parentCollectionId, bytes32 conditionId, uint[] indexSets)'
    ]);

    // This is a simplified version - in production you'd need to:
    // 1. Get the condition ID from the market
    // 2. Calculate the correct index sets
    // 3. Handle multiple positions properly

    const redeemData = iface.encodeFunctionData('redeemPositions', [
      '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
      ethers.ZeroHash,
      '0x' + '00'.repeat(32), // placeholder conditionId
      [1, 2] // placeholder index sets
    ]);

    const safeTransaction = {
      to: ctfAddress,
      value: '0',
      data: redeemData,
      operation: 0 // CALL
    };

    const response = await safeRelayClient.executeSafeTransactions([safeTransaction], safeAddress);
    const result = await response.wait();

    return {
      success: true,
      transactionHash: result.hash,
      redeemedAmount: 'calculated_amount' // Would calculate actual redeemed USDC
    };

  } catch (error) {
    console.error('❌ Position redemption failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// HTTP API Endpoints
app.post('/place-order', validateSchema(orderSchema), async (req, res) => {
  try {
    const { marketId, side, size, price, safeAddress, outcome } = req.body;

    if (!marketId || !side || !size || !price || !safeAddress || !outcome) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: marketId, side, size, price, safeAddress, outcome'
      });
    }

    // For Phase 3: Enhanced order placement with CTF operations
    console.log(`Placing ${side} order: ${size} ${outcome} @ ${price} on market ${marketId} via Safe ${safeAddress}`);

    // Get market details to determine if CLOB or AMM
    const marketDetails = await getMarketDetails(marketId);
    const isCLOB = marketDetails.enableOrderBook || false;

    if (isCLOB) {
      // Use CLOB for order placement
      const result = await placeOrder(marketId, side, size, price);
      res.json(result);
    } else {
      // Use AMM/CTF for direct trading (gasless via Safe)
      const ammResult = await placeAMMOrder(safeAddress, marketId, side, size, price, outcome);
      res.json(ammResult);
    }
  } catch (error) {
    console.error('Order placement failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/deploy-safe', async (req, res) => {
  try {
    const { userPrivateKey } = req.body;

    if (!userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userPrivateKey'
      });
    }

    // Create a temporary RelayClient for this user
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const privateKey = userPrivateKey.startsWith('0x') ? userPrivateKey.slice(2) : userPrivateKey;
    const wallet = new ethers.Wallet(privateKey, provider);

    const userRelayClient = new RelayClient(
      'https://relayer-v2.polymarket.com/',
      137, // Polygon chain ID
      wallet
    );

    console.log(`Deploying Safe wallet for user...`);

    const response = await userRelayClient.deploySafe();
    const result = await response.wait();

    if (result && result.proxyAddress) {
      console.log(`✅ Safe wallet deployed: ${result.proxyAddress}`);
      res.json({
        success: true,
        safeAddress: result.proxyAddress,
        transactionHash: result.transactionHash
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Safe deployment failed - no proxy address returned'
      });
    }

  } catch (error) {
    console.error('❌ Safe deployment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/approve-usdc', async (req, res) => {
  try {
    const { safeAddress, amount } = req.body;

    if (!safeAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: safeAddress'
      });
    }

    // Parse amount (default to max approval)
    const approvalAmount = amount ? ethers.utils.parseUnits(amount, 6) : ethers.MaxUint256;

    console.log(`Approving ${amount || 'unlimited'} USDC for Safe: ${safeAddress}`);

    // Create a temporary RelayClient for this Safe
    const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

    // For Safe operations, we need the owner's private key
    // In production, this would be securely managed
    const ownerPrivateKey = POLYMARKET_PRIVATE_KEY.startsWith('0x')
      ? POLYMARKET_PRIVATE_KEY.slice(2)
      : POLYMARKET_PRIVATE_KEY;
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);

    const safeRelayClient = new RelayClient(
      'https://relayer-v2.polymarket.com/',
      137, // Polygon chain ID
      ownerWallet
    );

    // USDC contract address on Polygon
    const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const spenderAddress = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045'; // CTF

    // Create approval transaction
    const iface = new ethers.Interface([
      'function approve(address spender, uint256 amount)'
    ]);

    const encodedApprove = iface.encodeFunctionData('approve', [spenderAddress, approvalAmount]);

    const safeTransaction = {
      to: usdcAddress,
      value: '0',
      data: encodedApprove,
      operation: 0 // CALL
    };

    const response = await safeRelayClient.executeSafeTransactions([safeTransaction], safeAddress);
    const result = await response.wait();

    if (result && result.hash) {
      console.log(`✅ USDC approval successful: ${result.hash}`);
      res.json({
        success: true,
        transactionHash: result.hash
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'USDC approval failed - no transaction hash returned'
      });
    }

  } catch (error) {
    console.error('❌ USDC approval failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/order-book/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params;

    if (!marketId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: marketId'
      });
    }

    const result = await getOrderBook(marketId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/positions/:safeAddress', async (req, res) => {
  try {
    const { safeAddress } = req.params;

    if (!safeAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: safeAddress'
      });
    }

    const result = await getPositions(safeAddress);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/redeem-position', async (req, res) => {
  try {
    const { safeAddress, tokenIds, amounts } = req.body;

    if (!safeAddress || !tokenIds || !amounts) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: safeAddress, tokenIds, amounts'
      });
    }

    const result = await redeemPositions(safeAddress, tokenIds, amounts);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Polymarket Builder Trading Service',
    port: PORT,
    clients: {
      clob: clobClient ? 'initialized' : 'failed',
      relay: relayClient ? 'initialized' : 'failed'
    }
  });
});

// Start server
if (require.main === module) {
  // Initialize clients on startup
  initializeClients();

  app.listen(PORT, () => {
    console.log(`🚀 Polymarket Builder Trading Service running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`💰 Place order: POST http://localhost:${PORT}/place-order`);
    console.log(`🏦 Deploy Safe: POST http://localhost:${PORT}/deploy-safe`);
    console.log(`✅ Approve USDC: POST http://localhost:${PORT}/approve-usdc`);
    console.log(`📊 Get positions: GET http://localhost:${PORT}/positions/:safeAddress`);
    console.log(`💸 Redeem position: POST http://localhost:${PORT}/redeem-position`);
  });
}

// Export functions for use by Python backend
module.exports = {
  initializeClients,
  deploySafeWallet,
  approveUSDC,
  placeOrder,
  getOrderBook,
  getPositions
};

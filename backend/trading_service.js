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
const { ClobClient } = require('@polymarket/clob-client');
const { RelayClient } = require('@polymarket/builder-relayer-client');
const { BuilderConfig } = require('@polymarket/builder-signing-sdk');
const { ethers } = require('ethers');

// Initialize Express app
const app = express();
const PORT = process.env.TRADING_SERVICE_PORT || 5002;

// Middleware
app.use(express.json());

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
      relayClient = new RelayClient(
        'https://relayer-v2.polymarket.com/',
        137, // Polygon chain ID
        wallet,
        null // No builder config needed for relay client
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
 * Get user's positions
 */
async function getPositions(userWallet) {
  try {
    initializeClients();

    // This would typically query the user's positions
    // For now, return empty array
    return {
      success: true,
      positions: []
    };

  } catch (error) {
    console.error('❌ Failed to get positions:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// HTTP API Endpoints
app.post('/place-order', async (req, res) => {
  try {
    const { marketId, side, size, price } = req.body;

    if (!marketId || !side || !size || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: marketId, side, size, price'
      });
    }

    const result = await placeOrder(marketId, side, size, price);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/deploy-safe', async (req, res) => {
  try {
    const { userWalletAddress } = req.body;

    if (!userWalletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userWalletAddress'
      });
    }

    const result = await deploySafeWallet(userWalletAddress);
    res.json(result);
  } catch (error) {
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

    const result = await approveUSDC(safeAddress, amount);
    res.json(result);
  } catch (error) {
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

app.get('/positions/:userWallet', async (req, res) => {
  try {
    const { userWallet } = req.params;

    if (!userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userWallet'
      });
    }

    const result = await getPositions(userWallet);
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

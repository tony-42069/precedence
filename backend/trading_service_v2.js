/**
 * Polymarket Builder Trading Service v2 - REFACTORED
 * 
 * Based on ayv8er/polymarket-safe-trader implementation
 * 
 * KEY INSIGHT: Builder credentials are ONLY for attribution/signing.
 * User API credentials (derived from wallet signature) are needed for CLOB operations.
 * 
 * Flow:
 * 1. User provides private key
 * 2. Initialize RelayClient with builder config → Deploy Safe
 * 3. Create temp ClobClient → Derive User API credentials (signature required)
 * 4. Create authenticated ClobClient with User API credentials → Place orders
 */

require('dotenv').config({ path: './.env', silent: true });
const express = require('express');
const fs = require('fs');
const path = require('path');
const { ClobClient } = require('@polymarket/clob-client');
const { RelayClient } = require('@polymarket/builder-relayer-client');
const { BuilderConfig } = require('@polymarket/builder-signing-sdk');
const { deriveSafe } = require('@polymarket/builder-relayer-client/dist/builder/derive');
const { getContractConfig } = require('@polymarket/builder-relayer-client/dist/config');
const { ethers } = require('ethers');
const { createWalletClient, http } = require('viem');
const { privateKeyToAccount } = require('viem/accounts');
const { polygon } = require('viem/chains');

// Initialize Express app
const app = express();
const PORT = process.env.TRADING_SERVICE_PORT || 5002;

// Middleware
app.use(express.json());

// Configuration
const SIGNING_SERVER_URL = process.env.POLYMARKET_SIGNING_SERVER_URL || 'http://localhost:5001/sign';
const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const CLOB_API_URL = 'https://clob.polymarket.com';
const POLYGON_CHAIN_ID = 137;
const POLYGON_RPC_URL = 'https://polygon-rpc.com';

// ===========================================
// PRECEDENCE FEE CONFIGURATION
// ===========================================
const PRECEDENCE_TREASURY_ADDRESS = process.env.PRECEDENCE_TREASURY_ADDRESS;
const PRECEDENCE_TREASURY_PRIVATE_KEY = process.env.PRECEDENCE_TREASURY_PRIVATE_KEY;
const PRECEDENCE_FEE_PERCENT = parseFloat(process.env.PRECEDENCE_FEE_PERCENT || '1'); // Default 1%
const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC on Polygon
const USDC_DECIMALS = 6;

// Fee logging file path
const FEE_LOG_PATH = path.join(__dirname, 'data', 'fee_transactions.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Initialize fee log file if it doesn't exist
if (!fs.existsSync(FEE_LOG_PATH)) {
  fs.writeFileSync(FEE_LOG_PATH, JSON.stringify({ transactions: [], totalCollected: '0' }, null, 2));
}

// In-memory session storage (in production, use Redis or database)
const userSessions = new Map();

console.log('='.repeat(60));
console.log('Polymarket Builder Trading Service v2 - REFACTORED');
console.log('='.repeat(60));
console.log('SIGNING_SERVER_URL:', SIGNING_SERVER_URL);
console.log('TREASURY_ADDRESS:', PRECEDENCE_TREASURY_ADDRESS || '❌ NOT SET');
console.log('FEE_PERCENT:', PRECEDENCE_FEE_PERCENT + '%');

/**
 * Helper: Create ethers signer from private key
 * Wraps ethers v6 signer to be compatible with ClobClient (expects ethers v5)
 */
function createEthersSigner(privateKey) {
  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // ClobClient expects ethers v5 which has _signTypedData
  // ethers v6 renamed it to signTypedData (no underscore)
  // Create a compatibility wrapper
  wallet._signTypedData = async (domain, types, value) => {
    return wallet.signTypedData(domain, types, value);
  };
  
  return wallet;
}

/**
 * Helper: Create viem wallet client from private key
 */
function createViemWalletClient(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: polygon,
    transport: http(POLYGON_RPC_URL)
  });
}

/**
 * Helper: Get builder config for remote signing
 */
function getBuilderConfig() {
  return new BuilderConfig({
    remoteBuilderConfig: {
      url: SIGNING_SERVER_URL
    }
  });
}

/**
 * Helper: Derive Safe address from EOA (deterministic)
 */
function deriveSafeAddress(eoaAddress) {
  const config = getContractConfig(POLYGON_CHAIN_ID);
  return deriveSafe(eoaAddress, config.SafeContracts.SafeFactory);
}

// ===========================================
// FEE SYSTEM HELPERS
// ===========================================

/**
 * Calculate fee for a trade
 * @param {number} tradeValue - The trade value in USD
 * @param {string} side - 'BUY' or 'SELL'
 * @returns {object} Fee calculation result
 */
function calculateFee(tradeValue, side) {
  // Only charge fees on SELL orders
  if (side.toUpperCase() !== 'SELL') {
    return {
      tradeValue: tradeValue,
      feePercent: 0,
      feeAmount: 0,
      netAmount: tradeValue,
      hasFee: false
    };
  }

  const feeAmount = tradeValue * (PRECEDENCE_FEE_PERCENT / 100);
  const netAmount = tradeValue - feeAmount;

  return {
    tradeValue: tradeValue,
    feePercent: PRECEDENCE_FEE_PERCENT,
    feeAmount: parseFloat(feeAmount.toFixed(6)),
    netAmount: parseFloat(netAmount.toFixed(6)),
    hasFee: true
  };
}

/**
 * Log fee transaction to file
 * @param {object} feeData - Fee transaction data
 */
function logFeeTransaction(feeData) {
  try {
    const logData = JSON.parse(fs.readFileSync(FEE_LOG_PATH, 'utf8'));

    const transaction = {
      id: `fee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: feeData.userId || null,
      walletAddress: feeData.walletAddress,
      safeAddress: feeData.safeAddress,
      marketId: feeData.marketId,
      tokenId: feeData.tokenId,
      side: feeData.side,
      tradeValue: feeData.tradeValue,
      feePercent: feeData.feePercent,
      feeAmount: feeData.feeAmount,
      treasuryTxHash: feeData.treasuryTxHash || null,
      orderTxHash: feeData.orderTxHash || null,
      status: feeData.status || 'completed'
    };

    logData.transactions.push(transaction);

    // Update total collected
    const currentTotal = parseFloat(logData.totalCollected || '0');
    logData.totalCollected = (currentTotal + feeData.feeAmount).toFixed(6);

    fs.writeFileSync(FEE_LOG_PATH, JSON.stringify(logData, null, 2));

    console.log(`💰 Fee logged: $${feeData.feeAmount} (Total: $${logData.totalCollected})`);

    return transaction;
  } catch (error) {
    console.error('❌ Failed to log fee transaction:', error);
    return null;
  }
}

/**
 * Get fee transaction history
 * @param {string} walletAddress - Optional filter by wallet address
 * @returns {object} Fee history data
 */
function getFeeHistory(walletAddress = null) {
  try {
    const logData = JSON.parse(fs.readFileSync(FEE_LOG_PATH, 'utf8'));

    if (walletAddress) {
      const filtered = logData.transactions.filter(
        tx => tx.walletAddress?.toLowerCase() === walletAddress.toLowerCase() ||
              tx.safeAddress?.toLowerCase() === walletAddress.toLowerCase()
      );

      const userTotal = filtered.reduce((sum, tx) => sum + tx.feeAmount, 0);

      return {
        transactions: filtered,
        totalPaid: userTotal.toFixed(6),
        count: filtered.length
      };
    }

    return {
      transactions: logData.transactions,
      totalCollected: logData.totalCollected,
      count: logData.transactions.length
    };
  } catch (error) {
    console.error('❌ Failed to get fee history:', error);
    return { transactions: [], totalCollected: '0', count: 0 };
  }
}

/**
 * Transfer USDC fee from user Safe to treasury
 * Uses RelayClient to execute gasless transfer from user's Safe
 * @param {string} userPrivateKey - User's private key
 * @param {string} safeAddress - User's Safe address
 * @param {number} feeAmount - Fee amount in USDC
 * @returns {object} Transfer result
 */
async function transferFeeToTreasury(userPrivateKey, safeAddress, feeAmount) {
  try {
    if (!PRECEDENCE_TREASURY_ADDRESS) {
      throw new Error('Treasury address not configured');
    }

    if (feeAmount <= 0) {
      return { success: true, skipped: true, reason: 'No fee to transfer' };
    }

    console.log(`💸 Transferring $${feeAmount} USDC fee to treasury...`);
    console.log(`   From Safe: ${safeAddress}`);
    console.log(`   To Treasury: ${PRECEDENCE_TREASURY_ADDRESS}`);

    // Create viem wallet client for RelayClient
    const walletClient = createViemWalletClient(userPrivateKey);
    const builderConfig = getBuilderConfig();

    const relayClient = new RelayClient(
      RELAYER_URL,
      POLYGON_CHAIN_ID,
      walletClient,
      builderConfig
    );

    // Convert fee to USDC units (6 decimals)
    const feeAmountUnits = ethers.parseUnits(feeAmount.toFixed(6), USDC_DECIMALS);

    // Create USDC transfer transaction
    const erc20Interface = new ethers.Interface([
      'function transfer(address to, uint256 amount)'
    ]);

    const transferData = erc20Interface.encodeFunctionData('transfer', [
      PRECEDENCE_TREASURY_ADDRESS,
      feeAmountUnits
    ]);

    const transferTx = {
      to: USDC_ADDRESS,
      value: '0',
      data: transferData,
      operation: 0 // CALL
    };

    // Execute transfer via RelayClient
    const response = await relayClient.execute([transferTx], safeAddress);
    const result = await response.wait();

    const txHash = result?.hash || result?.transactionHash;

    console.log(`✅ Fee transferred successfully: ${txHash}`);

    return {
      success: true,
      transactionHash: txHash,
      feeAmount: feeAmount,
      treasuryAddress: PRECEDENCE_TREASURY_ADDRESS
    };

  } catch (error) {
    console.error('❌ Fee transfer failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * STEP 1: Initialize Trading Session
 * 
 * This derives the Safe address and prepares for trading.
 * Does NOT deploy the Safe yet (that's a separate step).
 */
app.post('/init-session', async (req, res) => {
  try {
    const { userPrivateKey } = req.body;
    
    if (!userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userPrivateKey'
      });
    }

    // Create signer and get EOA address
    const signer = createEthersSigner(userPrivateKey);
    const eoaAddress = await signer.getAddress();
    
    // Derive Safe address (deterministic from EOA)
    const safeAddress = deriveSafeAddress(eoaAddress);
    
    // Store session data
    userSessions.set(eoaAddress, {
      privateKey: userPrivateKey,
      eoaAddress,
      safeAddress,
      isSafeDeployed: false,
      hasApiCredentials: false,
      apiCredentials: null,
      hasApprovals: false,
      createdAt: Date.now()
    });

    console.log(`✅ Session initialized for EOA: ${eoaAddress}`);
    console.log(`   Derived Safe address: ${safeAddress}`);

    res.json({
      success: true,
      eoaAddress,
      safeAddress,
      message: 'Session initialized. Next: deploy-safe or derive-credentials'
    });

  } catch (error) {
    console.error('❌ Session initialization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * STEP 2: Deploy Safe Wallet
 * 
 * Uses RelayClient with builder config for authentication.
 */
app.post('/deploy-safe', async (req, res) => {
  try {
    const { userPrivateKey } = req.body;
    
    if (!userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userPrivateKey'
      });
    }

    // Get or create session
    const signer = createEthersSigner(userPrivateKey);
    const eoaAddress = await signer.getAddress();
    
    let session = userSessions.get(eoaAddress);
    if (!session) {
      // Auto-initialize session
      const safeAddress = deriveSafeAddress(eoaAddress);
      session = {
        privateKey: userPrivateKey,
        eoaAddress,
        safeAddress,
        isSafeDeployed: false,
        hasApiCredentials: false,
        apiCredentials: null,
        hasApprovals: false,
        createdAt: Date.now()
      };
      userSessions.set(eoaAddress, session);
    }

    console.log(`🏦 Deploying Safe for EOA: ${eoaAddress}`);
    console.log(`   Target Safe address: ${session.safeAddress}`);

    // Create viem wallet client for RelayClient
    const walletClient = createViemWalletClient(userPrivateKey);

    // Create builder config for relay authentication
    const builderConfig = getBuilderConfig();

    console.log('🔧 Creating RelayClient with builder config...');
    console.log('   Builder config URL:', SIGNING_SERVER_URL);

    // Create RelayClient
    const relayClient = new RelayClient(
      RELAYER_URL,
      POLYGON_CHAIN_ID,
      walletClient,
      builderConfig
    );

    // Check if Safe is already deployed
    try {
      const isDeployed = await relayClient.getDeployed(session.safeAddress);
      if (isDeployed) {
        console.log('✅ Safe already deployed!');
        session.isSafeDeployed = true;
        userSessions.set(eoaAddress, session);
        
        return res.json({
          success: true,
          safeAddress: session.safeAddress,
          alreadyDeployed: true,
          message: 'Safe was already deployed. Next: derive-credentials'
        });
      }
    } catch (checkError) {
      console.log('⚠️ Could not check deployment status, attempting deploy...');
    }

    // Deploy Safe
    console.log('🚀 Calling relayClient.deploy()...');
    const response = await relayClient.deploy();
    const result = await response.wait();

    if (result && result.proxyAddress) {
      console.log(`✅ Safe deployed at: ${result.proxyAddress}`);
      
      session.isSafeDeployed = true;
      session.safeAddress = result.proxyAddress;
      userSessions.set(eoaAddress, session);

      res.json({
        success: true,
        safeAddress: result.proxyAddress,
        transactionHash: result.transactionHash,
        message: 'Safe deployed! Next: derive-credentials'
      });
    } else {
      throw new Error('No proxy address returned from deployment');
    }

  } catch (error) {
    console.error('❌ Safe deployment failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * STEP 3: Derive User API Credentials
 * 
 * THIS IS THE KEY MISSING PIECE!
 * Creates a temporary ClobClient and derives User API credentials via signature.
 */
app.post('/derive-credentials', async (req, res) => {
  try {
    const { userPrivateKey } = req.body;
    
    if (!userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userPrivateKey'
      });
    }

    // Get session
    const signer = createEthersSigner(userPrivateKey);
    const eoaAddress = await signer.getAddress();
    
    let session = userSessions.get(eoaAddress);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Session not initialized. Call /init-session first.'
      });
    }

    // Check if we already have credentials
    if (session.hasApiCredentials && session.apiCredentials) {
      console.log('✅ User API credentials already exist');
      return res.json({
        success: true,
        hasCredentials: true,
        message: 'Credentials already derived. Ready to trade!'
      });
    }

    console.log(`🔑 Deriving User API credentials for EOA: ${eoaAddress}`);

    // Create TEMPORARY ClobClient (no credentials, no builder config)
    // This is used ONLY to derive/create User API credentials
    const tempClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      signer
    );

    let credentials;
    
    try {
      // Try to derive existing credentials first (for returning users)
      console.log('   Attempting to derive existing credentials...');
      credentials = await tempClient.deriveApiKey();
      
      if (credentials?.key && credentials?.secret && credentials?.passphrase) {
        console.log('✅ Derived existing User API credentials');
      } else {
        throw new Error('Invalid derived credentials');
      }
    } catch (deriveError) {
      // If derive fails, create new credentials
      console.log('   Derive failed, creating new credentials...');
      credentials = await tempClient.createApiKey();
      console.log('✅ Created new User API credentials');
    }

    // Store credentials in session
    session.hasApiCredentials = true;
    session.apiCredentials = credentials;
    userSessions.set(eoaAddress, session);

    res.json({
      success: true,
      hasCredentials: true,
      // Don't expose actual credentials in response for security
      message: 'User API credentials derived successfully. Ready to trade!'
    });

  } catch (error) {
    console.error('❌ Credential derivation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * STEP 4: Set Token Approvals
 * 
 * Approves USDC and outcome tokens for trading contracts.
 */
app.post('/set-approvals', async (req, res) => {
  try {
    const { userPrivateKey } = req.body;
    
    if (!userPrivateKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: userPrivateKey'
      });
    }

    const signer = createEthersSigner(userPrivateKey);
    const eoaAddress = await signer.getAddress();
    
    const session = userSessions.get(eoaAddress);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Session not initialized. Call /init-session first.'
      });
    }

    if (!session.isSafeDeployed) {
      return res.status(400).json({
        success: false,
        error: 'Safe not deployed. Call /deploy-safe first.'
      });
    }

    console.log(`✅ Setting token approvals for Safe: ${session.safeAddress}`);

    // Create viem wallet client for RelayClient
    const walletClient = createViemWalletClient(userPrivateKey);
    const builderConfig = getBuilderConfig();

    const relayClient = new RelayClient(
      RELAYER_URL,
      POLYGON_CHAIN_ID,
      walletClient,
      builderConfig
    );

    // Contract addresses
    const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
    const CTF_ADDRESS = '0x4d97dcd97ec945f40cf65f87097ace5ea0476045';
    const CTF_EXCHANGE = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
    const NEG_RISK_CTF_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
    const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';

    // ERC-20 approval interface
    const erc20Interface = new ethers.Interface([
      'function approve(address spender, uint256 amount)'
    ]);

    // ERC-1155 approval interface
    const erc1155Interface = new ethers.Interface([
      'function setApprovalForAll(address operator, bool approved)'
    ]);

    const MAX_UINT256 = ethers.MaxUint256;

    // Create all approval transactions
    const approvalTxs = [
      // USDC approvals (ERC-20)
      {
        to: USDC_ADDRESS,
        value: '0',
        data: erc20Interface.encodeFunctionData('approve', [CTF_ADDRESS, MAX_UINT256]),
        operation: 0
      },
      {
        to: USDC_ADDRESS,
        value: '0',
        data: erc20Interface.encodeFunctionData('approve', [CTF_EXCHANGE, MAX_UINT256]),
        operation: 0
      },
      {
        to: USDC_ADDRESS,
        value: '0',
        data: erc20Interface.encodeFunctionData('approve', [NEG_RISK_CTF_EXCHANGE, MAX_UINT256]),
        operation: 0
      },
      {
        to: USDC_ADDRESS,
        value: '0',
        data: erc20Interface.encodeFunctionData('approve', [NEG_RISK_ADAPTER, MAX_UINT256]),
        operation: 0
      },
      // Outcome token approvals (ERC-1155)
      {
        to: CTF_ADDRESS,
        value: '0',
        data: erc1155Interface.encodeFunctionData('setApprovalForAll', [CTF_EXCHANGE, true]),
        operation: 0
      },
      {
        to: CTF_ADDRESS,
        value: '0',
        data: erc1155Interface.encodeFunctionData('setApprovalForAll', [NEG_RISK_CTF_EXCHANGE, true]),
        operation: 0
      },
      {
        to: CTF_ADDRESS,
        value: '0',
        data: erc1155Interface.encodeFunctionData('setApprovalForAll', [NEG_RISK_ADAPTER, true]),
        operation: 0
      }
    ];

    console.log(`   Executing ${approvalTxs.length} approval transactions...`);

    // Execute all approvals in batch
    const response = await relayClient.execute(approvalTxs, session.safeAddress);
    const result = await response.wait();

    session.hasApprovals = true;
    userSessions.set(eoaAddress, session);

    console.log('✅ All token approvals set successfully');

    res.json({
      success: true,
      transactionHash: result?.hash || result?.transactionHash,
      message: 'All token approvals set. Ready to trade!'
    });

  } catch (error) {
    console.error('❌ Token approval failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * STEP 5: Place Order
 *
 * Uses authenticated ClobClient with User API credentials + builder config.
 * For SELL orders: Charges 1% fee transferred to Precedence treasury.
 */
app.post('/place-order', async (req, res) => {
  try {
    const { userPrivateKey, tokenId, price, size, side, marketId, userId } = req.body;

    if (!userPrivateKey || !tokenId || price === undefined || !size || !side) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: userPrivateKey, tokenId, price, size, side'
      });
    }

    const signer = createEthersSigner(userPrivateKey);
    const eoaAddress = await signer.getAddress();

    const session = userSessions.get(eoaAddress);
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Session not initialized. Call /init-session first.'
      });
    }

    if (!session.hasApiCredentials || !session.apiCredentials) {
      return res.status(400).json({
        success: false,
        error: 'User API credentials not derived. Call /derive-credentials first.'
      });
    }

    // Calculate trade value and fee
    const tradeValue = parseFloat(price) * parseFloat(size);
    const feeCalc = calculateFee(tradeValue, side);

    console.log(`📊 Placing ${side} order: ${size} @ ${price} for token ${tokenId}`);
    if (feeCalc.hasFee) {
      console.log(`💰 Fee: $${feeCalc.feeAmount} (${feeCalc.feePercent}%)`);
    }

    // Create authenticated ClobClient with User API credentials + builder config
    const builderConfig = getBuilderConfig();

    const clobClient = new ClobClient(
      CLOB_API_URL,
      POLYGON_CHAIN_ID,
      signer,
      session.apiCredentials,  // User API credentials (key, secret, passphrase)
      2,                       // signatureType = 2 for EOA/browser wallet
      session.safeAddress,     // funder address (Safe)
      undefined,               // mandatory placeholder
      false,
      builderConfig            // Builder config for order attribution
    );

    // Create order
    const order = {
      tokenID: tokenId,
      price: parseFloat(price),
      size: parseFloat(size),
      side: side.toUpperCase(),
      feeRateBps: 0,
      expiration: 0,  // Good-til-Cancel
      taker: '0x0000000000000000000000000000000000000000'
    };

    // Create and post order
    const orderResponse = await clobClient.createAndPostOrder(order);

    console.log('✅ Order placed successfully:', orderResponse);

    // For SELL orders: Transfer fee to treasury
    let feeTransferResult = null;
    if (feeCalc.hasFee && feeCalc.feeAmount > 0) {
      console.log(`💸 Processing ${feeCalc.feePercent}% platform fee...`);

      feeTransferResult = await transferFeeToTreasury(
        userPrivateKey,
        session.safeAddress,
        feeCalc.feeAmount
      );

      // Log fee transaction
      logFeeTransaction({
        userId: userId || null,
        walletAddress: eoaAddress,
        safeAddress: session.safeAddress,
        marketId: marketId || null,
        tokenId: tokenId,
        side: side.toUpperCase(),
        tradeValue: tradeValue,
        feePercent: feeCalc.feePercent,
        feeAmount: feeCalc.feeAmount,
        treasuryTxHash: feeTransferResult?.transactionHash || null,
        orderTxHash: orderResponse?.orderID || orderResponse?.id,
        status: feeTransferResult?.success ? 'completed' : 'fee_transfer_failed'
      });
    }

    res.json({
      success: true,
      orderId: orderResponse?.orderID || orderResponse?.id,
      order: orderResponse,
      fee: feeCalc.hasFee ? {
        feePercent: feeCalc.feePercent,
        feeAmount: feeCalc.feeAmount,
        tradeValue: tradeValue,
        netAmount: feeCalc.netAmount,
        treasuryTxHash: feeTransferResult?.transactionHash || null,
        feeTransferSuccess: feeTransferResult?.success || false
      } : null
    });

  } catch (error) {
    console.error('❌ Order placement failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * STEP 6: Resolve Market - Get tokenIds for a market
 * 
 * Fetches market details from Polymarket Gamma API and returns
 * the clobTokenIds needed for placing orders.
 * 
 * Accepts: marketId, conditionId, or slug
 */
app.post('/resolve-market', async (req, res) => {
  try {
    const { marketId, conditionId, slug } = req.body;
    
    if (!marketId && !conditionId && !slug) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameter: marketId, conditionId, or slug'
      });
    }

    const searchTerm = marketId || conditionId || slug;
    console.log(`🔍 Resolving market: ${searchTerm}`);

    let market;

    // Strategy 1: Try slug lookup first
    if (slug && !market) {
      try {
        const slugUrl = `https://gamma-api.polymarket.com/markets?slug=${slug}`;
        console.log(`   Trying slug: ${slugUrl}`);
        const response = await fetch(slugUrl);
        const markets = await response.json();
        if (markets && markets.length > 0) {
          market = markets[0];
          console.log(`   ✓ Found via slug`);
        }
      } catch (e) {
        console.log(`   ✗ Slug lookup failed`);
      }
    }

    // Strategy 2: Try condition_id lookup
    if ((conditionId || marketId) && !market) {
      try {
        const id = conditionId || marketId;
        const conditionUrl = `https://gamma-api.polymarket.com/markets?condition_id=${id}`;
        console.log(`   Trying condition_id: ${conditionUrl}`);
        const response = await fetch(conditionUrl);
        const markets = await response.json();
        if (markets && markets.length > 0) {
          market = markets[0];
          console.log(`   ✓ Found via condition_id`);
        }
      } catch (e) {
        console.log(`   ✗ Condition lookup failed`);
      }
    }

    // Strategy 3: Try direct ID lookup (Gamma internal ID)
    if (marketId && !market) {
      try {
        const directUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
        console.log(`   Trying direct ID: ${directUrl}`);
        const response = await fetch(directUrl);
        if (response.ok) {
          market = await response.json();
          console.log(`   ✓ Found via direct ID`);
        }
      } catch (e) {
        console.log(`   ✗ Direct lookup failed`);
      }
    }

    // Strategy 4: Try clob_token_ids lookup
    if (marketId && !market) {
      try {
        const clobUrl = `https://gamma-api.polymarket.com/markets?clob_token_ids=${marketId}`;
        console.log(`   Trying clob_token_ids: ${clobUrl}`);
        const response = await fetch(clobUrl);
        const markets = await response.json();
        if (markets && markets.length > 0) {
          market = markets[0];
          console.log(`   ✓ Found via clob_token_ids`);
        }
      } catch (e) {
        console.log(`   ✗ Clob lookup failed`);
      }
    }

    if (!market) {
      return res.status(404).json({
        success: false,
        error: 'Market not found'
      });
    }

    // Extract token IDs - handle string or array
    let clobTokenIds = market.clobTokenIds || market.clob_token_ids || [];
    if (typeof clobTokenIds === 'string') {
      try {
        clobTokenIds = JSON.parse(clobTokenIds);
      } catch (e) {}
    }
    
    let yesTokenId, noTokenId;
    if (Array.isArray(clobTokenIds) && clobTokenIds.length >= 2) {
      yesTokenId = clobTokenIds[0];
      noTokenId = clobTokenIds[1];
    }

    // Get prices
    let yesPrice = 0.5, noPrice = 0.5;
    try {
      let prices = market.outcomePrices || market.outcome_prices;
      if (typeof prices === 'string') prices = JSON.parse(prices);
      if (Array.isArray(prices) && prices.length >= 2) {
        yesPrice = parseFloat(prices[0]);
        noPrice = parseFloat(prices[1]);
      }
    } catch (e) {}

    console.log(`✅ Market resolved:`);
    console.log(`   Question: ${market.question}`);
    console.log(`   Yes Token: ${yesTokenId}`);
    console.log(`   No Token: ${noTokenId}`);

    res.json({
      success: true,
      market: {
        id: market.id,
        question: market.question,
        description: market.description,
        active: market.active,
        closed: market.closed,
        conditionId: market.condition_id || market.conditionId,
        slug: market.slug,
        volume: market.volume
      },
      tokens: {
        yes: yesTokenId,
        no: noTokenId
      },
      prices: {
        yes: yesPrice,
        no: noPrice
      }
    });

  } catch (error) {
    console.error('❌ Market resolution failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get session status
 */
app.get('/session/:eoaAddress', (req, res) => {
  const { eoaAddress } = req.params;
  const session = userSessions.get(eoaAddress);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    session: {
      eoaAddress: session.eoaAddress,
      safeAddress: session.safeAddress,
      isSafeDeployed: session.isSafeDeployed,
      hasApiCredentials: session.hasApiCredentials,
      hasApprovals: session.hasApprovals,
      createdAt: session.createdAt
    }
  });
});

// ===========================================
// FEE API ENDPOINTS
// ===========================================

/**
 * Estimate fee for a trade
 * GET /fees/estimate?amount={value}&side={buy|sell}
 */
app.get('/fees/estimate', (req, res) => {
  try {
    const { amount, side } = req.query;

    if (!amount || !side) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: amount, side'
      });
    }

    const tradeValue = parseFloat(amount);
    if (isNaN(tradeValue) || tradeValue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount: must be a positive number'
      });
    }

    const feeCalc = calculateFee(tradeValue, side);

    res.json({
      success: true,
      ...feeCalc,
      treasuryAddress: PRECEDENCE_TREASURY_ADDRESS
    });

  } catch (error) {
    console.error('❌ Fee estimation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get fee transaction history
 * GET /fees/history?walletAddress={address}
 */
app.get('/fees/history', (req, res) => {
  try {
    const { walletAddress } = req.query;
    const history = getFeeHistory(walletAddress || null);

    res.json({
      success: true,
      ...history
    });

  } catch (error) {
    console.error('❌ Fee history fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get treasury stats (admin)
 * GET /fees/treasury
 */
app.get('/fees/treasury', (req, res) => {
  try {
    const history = getFeeHistory();

    res.json({
      success: true,
      treasuryAddress: PRECEDENCE_TREASURY_ADDRESS,
      feePercent: PRECEDENCE_FEE_PERCENT,
      totalCollected: history.totalCollected,
      transactionCount: history.count
    });

  } catch (error) {
    console.error('❌ Treasury stats fetch failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Polymarket Builder Trading Service v2',
    version: '2.1.0',
    signingServerUrl: SIGNING_SERVER_URL,
    treasuryAddress: PRECEDENCE_TREASURY_ADDRESS,
    feePercent: PRECEDENCE_FEE_PERCENT,
    endpoints: {
      initSession: 'POST /init-session',
      deploySafe: 'POST /deploy-safe',
      deriveCredentials: 'POST /derive-credentials',
      setApprovals: 'POST /set-approvals',
      resolveMarket: 'POST /resolve-market',
      placeOrder: 'POST /place-order',
      getSession: 'GET /session/:eoaAddress',
      feeEstimate: 'GET /fees/estimate?amount={value}&side={buy|sell}',
      feeHistory: 'GET /fees/history?walletAddress={address}',
      treasuryStats: 'GET /fees/treasury'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log(`🚀 Service running on port ${PORT}`);
  console.log('');
  console.log('📋 TRADING FLOW:');
  console.log('   1. POST /init-session    - Initialize trading session');
  console.log('   2. POST /deploy-safe     - Deploy Safe wallet');
  console.log('   3. POST /derive-credentials - Derive User API credentials');
  console.log('   4. POST /set-approvals   - Set token approvals');
  console.log('   5. POST /resolve-market  - Get tokenIds for a market');
  console.log('   6. POST /place-order     - Place orders (SELL orders include 1% fee)');
  console.log('');
  console.log('💰 FEE ENDPOINTS:');
  console.log('   GET /fees/estimate       - Estimate fee for a trade');
  console.log('   GET /fees/history        - Get fee transaction history');
  console.log('   GET /fees/treasury       - Get treasury stats');
  console.log('');
  console.log('📊 Health check: http://localhost:' + PORT + '/health');
});

module.exports = app;

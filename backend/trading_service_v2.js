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

// In-memory session storage (in production, use Redis or database)
const userSessions = new Map();

console.log('='.repeat(60));
console.log('Polymarket Builder Trading Service v2 - REFACTORED');
console.log('='.repeat(60));
console.log('SIGNING_SERVER_URL:', SIGNING_SERVER_URL);

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
 */
app.post('/place-order', async (req, res) => {
  try {
    const { userPrivateKey, tokenId, price, size, side } = req.body;
    
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

    console.log(`📊 Placing ${side} order: ${size} @ ${price} for token ${tokenId}`);

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
    const response = await clobClient.createAndPostOrder(order);

    console.log('✅ Order placed successfully:', response);

    res.json({
      success: true,
      orderId: response?.orderID || response?.id,
      order: response
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

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Polymarket Builder Trading Service v2',
    version: '2.0.0',
    signingServerUrl: SIGNING_SERVER_URL,
    endpoints: {
      initSession: 'POST /init-session',
      deploySafe: 'POST /deploy-safe',
      deriveCredentials: 'POST /derive-credentials',
      setApprovals: 'POST /set-approvals',
      placeOrder: 'POST /place-order',
      getSession: 'GET /session/:eoaAddress'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log(`🚀 Service running on port ${PORT}`);
  console.log('');
  console.log('📋 CORRECT FLOW:');
  console.log('   1. POST /init-session    - Initialize trading session');
  console.log('   2. POST /deploy-safe     - Deploy Safe wallet');
  console.log('   3. POST /derive-credentials - Derive User API credentials');
  console.log('   4. POST /set-approvals   - Set token approvals');
  console.log('   5. POST /place-order     - Place orders');
  console.log('');
  console.log('📊 Health check: http://localhost:' + PORT + '/health');
});

module.exports = app;

/**
 * Polymarket CLOB WebSocket Service
 *
 * Provides live market data streaming using Polymarket's CLOB WebSocket channels.
 * Proxies CLOB events (order books, prices, trades) to frontend WebSocket clients.
 */

require('dotenv').config({ path: './.env', silent: true });
const WebSocket = require('ws');
const crypto = require('crypto');
const axios = require('axios');
const { ethers } = require('ethers');

// Configuration
const WS_PORT = process.env.WEBSOCKET_PORT || 5003;
const PRIVATE_KEY = process.env.POLYMARKET_PRIVATE_KEY;
const CLOB_HOST = 'https://clob.polymarket.com';
const CLOB_WS_HOST = 'wss://ws-subscriptions-clob.polymarket.com';

// Global state
let wss = null;
let clobCreds = null;
const activeSubscriptions = new Map(); // clientId -> Set of tokenIds
const marketSubscriptions = new Map(); // tokenId -> Set of clientIds
const clobConnections = new Map(); // tokenId -> WebSocket connection

/**
 * Derive CLOB API credentials using EIP-712 signing
 */
async function deriveCLOBCredentials(privateKey, host = CLOB_HOST) {
  try {
    const signer = new ethers.Wallet(privateKey);
    const address = signer.address;
    const timestamp = Date.now().toString();
    const nonce = '0'; // Default uint256 as string

    console.log('🔑 Deriving CLOB credentials for address:', address);

    // EIP-712 Domain (Polygon-specific)
    const domain = {
      name: "ClobAuthDomain",
      version: "1",
      chainId: 137  // Polygon mainnet
    };

    // EIP-712 Types (ClobAuth struct)
    const types = {
      ClobAuth: [
        { name: "address", type: "address" },
        { name: "timestamp", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "message", type: "string" }
      ]
    };

    // Value to sign
    const value = {
      address: address,
      timestamp: timestamp,
      nonce: nonce,
      message: "This message attests that I control the given wallet"
    };

    // Generate EIP-712 signature using ethers v6
    console.log('✍️ Signing EIP-712 authentication...');
    const signature = await signer.signTypedData(domain, types, value);
    console.log('✅ Got EIP-712 signature');

    // L1 Headers for authentication
    const headers = {
      'POLY_ADDRESS': address,
      'POLY_SIGNATURE': signature,
      'POLY_TIMESTAMP': timestamp,
      'POLY_NONCE': nonce,
      'Content-Type': 'application/json',
    };

    console.log('📡 Deriving API key from CLOB...');

    try {
      // Try to derive existing API key
      const response = await axios.get(`${host}/auth/derive-api-key`, { headers });
      const { key: apiKey, secret, passphrase } = response.data;
      console.log('✅ Derived existing CLOB API credentials');
      return { apiKey, secret, passphrase };
    } catch (deriveError) {
      if (deriveError.response?.status === 404) {
        console.log('📝 No existing API key found, creating new one...');
        // Fallback: Create new API key
        const createResponse = await axios.post(`${host}/auth/api-key`, {}, { headers });
        const { key: apiKey, secret, passphrase } = createResponse.data;
        console.log('✅ Created new CLOB API credentials');
        return { apiKey, secret, passphrase };
      } else {
        throw deriveError;
      }
    }
  } catch (error) {
    console.error('❌ Failed to derive CLOB credentials:');
    console.error('Error message:', error.message);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
    throw error;
  }
}

/**
 * Sign CLOB subscription message with HMAC
 */
function signCLOBMessage(action, channel, market, timestamp, apiKey, secret) {
  const payload = `${action}|${channel}|${market}|${timestamp}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return {
    action,
    channel,
    market,
    timestamp,
    signature,
    apiKey
  };
}

/**
 * Broadcast message to all clients subscribed to a specific market
 */
function broadcastToMarketSubscribers(marketId, message) {
  if (!marketSubscriptions.has(marketId)) return;

  const clientIds = marketSubscriptions.get(marketId);
  let sentCount = 0;

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN && clientIds.has(client.id)) {
      try {
        client.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        console.error('❌ Failed to send to client:', error);
      }
    }
  });

  if (sentCount > 0) {
    console.log(`📤 Broadcasted ${message.type} to ${sentCount} clients for market ${marketId}`);
  }
}

/**
 * Connect to CLOB WebSocket for a specific market
 */
function connectCLOBWebSocket(tokenId) {
  if (clobConnections.has(tokenId)) {
    console.log(`🔄 CLOB WS already connected for ${tokenId}`);
    return clobConnections.get(tokenId);
  }

  if (!clobCreds) {
    console.error('❌ No CLOB credentials available');
    return null;
  }

  const ws = new WebSocket(`${CLOB_WS_HOST}/ws/market`);
  console.log(`🔌 Connecting to CLOB WS for market ${tokenId}...`);

  ws.on('open', () => {
    console.log(`✅ CLOB WS connected for market ${tokenId}`);

    // Subscribe to market data
    const timestamp = Date.now();
    const subscribeMsg = signCLOBMessage(
      'subscribe',
      'market',
      tokenId,
      timestamp,
      clobCreds.apiKey,
      clobCreds.secret
    );

    ws.send(JSON.stringify(subscribeMsg));
    console.log(`📡 Subscribed to market ${tokenId} via CLOB WS`);
  });

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());
      console.log(`📊 CLOB Event for ${tokenId}:`, event.type);

      // Transform and broadcast to frontend clients
      let transformedEvent = null;

      switch (event.type) {
        case 'book':
          transformedEvent = {
            type: 'orderBook',
            marketId: tokenId,
            data: {
              bids: event.payload.bids || [],
              asks: event.payload.asks || [],
              timestamp: Date.now()
            }
          };
          break;

        case 'price_change':
          transformedEvent = {
            type: 'priceChange',
            marketId: tokenId,
            data: {
              price: event.payload.newPrice,
              change: event.payload.priceChange,
              timestamp: Date.now()
            }
          };
          break;

        case 'last_trade_price':
          transformedEvent = {
            type: 'trade',
            marketId: tokenId,
            data: {
              price: event.payload.price,
              size: event.payload.size,
              side: event.payload.side,
              timestamp: event.payload.timestamp
            }
          };
          break;

        default:
          console.log(`📨 Unhandled CLOB event type: ${event.type}`);
          return;
      }

      if (transformedEvent) {
        broadcastToMarketSubscribers(tokenId, transformedEvent);
      }
    } catch (error) {
      console.error('❌ Error processing CLOB message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error(`❌ CLOB WS error for ${tokenId}:`, error);
  });

  ws.on('close', () => {
    console.log(`🔌 CLOB WS closed for ${tokenId}`);
    clobConnections.delete(tokenId);

    // Auto-reconnect if still subscribed
    if (marketSubscriptions.has(tokenId) && marketSubscriptions.get(tokenId).size > 0) {
      console.log(`🔄 Auto-reconnecting CLOB WS for ${tokenId} in 5 seconds...`);
      setTimeout(() => connectCLOBWebSocket(tokenId), 5000);
    }
  });

  clobConnections.set(tokenId, ws);
  return ws;
}

/**
 * Subscribe to market data for a client
 */
function subscribeClientToMarket(clientId, marketId) {
  // Add to client's subscriptions
  if (!activeSubscriptions.has(clientId)) {
    activeSubscriptions.set(clientId, new Set());
  }
  activeSubscriptions.get(clientId).add(marketId);

  // Add to market's subscribers
  if (!marketSubscriptions.has(marketId)) {
    marketSubscriptions.set(marketId, new Set());
  }
  marketSubscriptions.get(marketId).add(clientId);

  // Connect to CLOB WebSocket for this market
  connectCLOBWebSocket(marketId);

  console.log(`✅ Client ${clientId} subscribed to market ${marketId}`);
}

/**
 * Unsubscribe client from market
 */
function unsubscribeClientFromMarket(clientId, marketId) {
  // Remove from client's subscriptions
  if (activeSubscriptions.has(clientId)) {
    activeSubscriptions.get(clientId).delete(marketId);
  }

  // Remove from market's subscribers
  if (marketSubscriptions.has(marketId)) {
    marketSubscriptions.get(marketId).delete(clientId);

    // If no more subscribers, close CLOB connection
    if (marketSubscriptions.get(marketId).size === 0) {
      const ws = clobConnections.get(marketId);
      if (ws) {
        ws.close();
        clobConnections.delete(marketId);
      }
      marketSubscriptions.delete(marketId);
    }
  }

  console.log(`❌ Client ${clientId} unsubscribed from market ${marketId}`);
}

/**
 * Handle client disconnection
 */
function handleClientDisconnect(clientId) {
  if (activeSubscriptions.has(clientId)) {
    const markets = activeSubscriptions.get(clientId);
    markets.forEach(marketId => {
      unsubscribeClientFromMarket(clientId, marketId);
    });
    activeSubscriptions.delete(clientId);
  }

  console.log(`👋 Client ${clientId} disconnected`);
}

/**
 * Initialize WebSocket server
 */
function initializeWebSocketServer() {
  wss = new WebSocket.Server({
    port: WS_PORT,
    perMessageDeflate: false
  });

  console.log(`🚀 WebSocket server started on port ${WS_PORT}`);

  wss.on('connection', (ws, req) => {
    // Assign unique ID to client
    ws.id = Date.now() + Math.random().toString(36).substr(2, 9);
    console.log(`🔗 New WebSocket connection: ${ws.id}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId: ws.id,
      message: 'Connected to Polymarket Live Data Stream'
    }));

    // Handle incoming messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case 'subscribe':
            if (message.marketId) {
              subscribeClientToMarket(ws.id, message.marketId);
              ws.send(JSON.stringify({
                type: 'subscribed',
                marketId: message.marketId
              }));
            }
            break;

          case 'unsubscribe':
            if (message.marketId) {
              unsubscribeClientFromMarket(ws.id, message.marketId);
              ws.send(JSON.stringify({
                type: 'unsubscribed',
                marketId: message.marketId
              }));
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          default:
            console.log(`📨 Unknown message type from ${ws.id}:`, message.type);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      handleClientDisconnect(ws.id);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for client ${ws.id}:`, error);
      handleClientDisconnect(ws.id);
    });
  });

  // Heartbeat to detect dead connections
  setInterval(() => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.ping();
      }
    });
  }, 30000); // 30 seconds
}

/**
 * Get server status
 */
function getServerStatus() {
  return {
    websocket: {
      port: WS_PORT,
      connections: wss ? wss.clients.size : 0,
      activeSubscriptions: activeSubscriptions.size,
      marketSubscriptions: marketSubscriptions.size
    },
    rtds: {
      connected: rtdClient ? true : false
    }
  };
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('🛑 Shutting down WebSocket service...');

  if (rtdClient) {
    rtdClient.disconnect();
  }

  if (wss) {
    wss.clients.forEach(client => client.close());
    wss.close();
  }

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Initialize services
if (require.main === module) {
  console.log('🔥 Starting Polymarket CLOB WebSocket Service');

  // Derive CLOB credentials
  (async () => {
    try {
      if (!PRIVATE_KEY) {
        throw new Error('POLYMARKET_PRIVATE_KEY not configured');
      }

      clobCreds = await deriveCLOBCredentials(PRIVATE_KEY);
      console.log('✅ CLOB credentials ready');

      // Initialize WebSocket server
      initializeWebSocketServer();

      // Health check endpoint
      const http = require('http');
      const healthServer = http.createServer((req, res) => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            service: 'Polymarket CLOB WebSocket Service',
            ...getServerStatus()
          }));
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      healthServer.listen(WS_PORT + 1, () => {
        console.log(`📊 Health check available at http://localhost:${WS_PORT + 1}/health`);
      });

      console.log('✅ Polymarket CLOB WebSocket Service ready!');
      console.log(`🔗 WebSocket endpoint: ws://localhost:${WS_PORT}`);
      console.log('📡 CLOB Status: Credentials derived and ready');

    } catch (error) {
      console.error('❌ Failed to initialize CLOB WebSocket service:', error.message);
      process.exit(1);
    }
  })();
}

// Export for testing
module.exports = {
  deriveCLOBCredentials,
  initializeWebSocketServer,
  getServerStatus,
  subscribeClientToMarket,
  unsubscribeClientFromMarket
};

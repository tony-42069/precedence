/**
 * Polymarket CLOB WebSocket Service
 *
 * Provides live market data streaming using Polymarket's CLOB WebSocket channels.
 * Proxies CLOB events (order books, prices, trades) to frontend WebSocket clients.
 */

require('dotenv').config({ path: './.env', silent: true });
const WebSocket = require('ws');
const { ClobClient } = require('@polymarket/clob-client');

// REST API Polling for Live Data (Phase 5 Fallback)
const POLLING_INTERVAL = 5000; // 5 seconds
const POLLED_MARKETS = new Map(); // marketId -> last data

// Configuration
const WS_PORT = process.env.WEBSOCKET_PORT || 5003;
const PRIVATE_KEY = process.env.POLYMARKET_PRIVATE_KEY;
const CLOB_HOST = 'https://clob.polymarket.com';
const CLOB_WS_HOST = 'wss://ws-subscriptions-clob.polymarket.com';
const RTDS_WS_HOST = 'wss://ws-live-data.polymarket.com'; // Real Time Data Stream for comments

// Global state
let wss = null;
let clobClient = null; // Official Polymarket client
let rtdsConnection = null; // RTDS WebSocket for comments
const activeSubscriptions = new Map(); // clientId -> Set of tokenIds
const marketSubscriptions = new Map(); // tokenId -> Set of clientIds
const clobConnections = new Map(); // conditionId -> WebSocket connection
const retryCounts = new Map(); // conditionId -> retry count

// Comments state (RTDS)
const commentSubscriptions = new Map(); // eventId -> Set of clientIds
const clientCommentSubscriptions = new Map(); // clientId -> Set of eventIds

/**
 * Create new CLOB API credentials using EIP-712 signing
 */
async function deriveCLOBCredentials(privateKey, host = CLOB_HOST) {
  try {
    const signer = new ethers.Wallet(privateKey);
    const address = signer.address;
    const timestamp = Date.now().toString();
    const nonce = '0'; // Default uint256 as string

    console.log('🔑 Creating new CLOB credentials for address:', address);

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

    console.log('📡 Creating new API key...');

    // Always create new API key (as requested)
    const createResponse = await axios.post(`${host}/auth/api-key`, {}, { headers });
    const { key: apiKey, secret, passphrase } = createResponse.data;
    console.log('✅ Created new CLOB API credentials');
    console.log('🔑 CLOB_API_KEY:', apiKey);
    console.log('🔐 CLOB_SECRET:', secret);
    console.log('🔒 CLOB_PASSPHRASE:', passphrase);
    return { apiKey, secret, passphrase };

  } catch (error) {
    console.error('❌ Failed to create CLOB credentials:');
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

// Verified active conditionId (2025 NHL market example; CLOB-enabled, high vol)
const ACTIVE_CONDITION_ID = '0x9915bea232fa12b20058f9cea1187ea51366352bf833393676cd0db557a58249';

async function getConditionId(tokenID = null) {
  console.log('🔍 Using verified active conditionId for 2025 market');
  return ACTIVE_CONDITION_ID;
}



// Updated connect: Correct JSON sub with type/assets_ids (no conditionId, no action/channel)
async function connectCLOBWebSocket(tokenId, maxRetries = 3) {
  const assetTokenId = tokenId || TOKEN_ID;  // Use provided or hardcoded
  const key = assetTokenId;
  const retries = retryCounts.get(key) || 0;

  if (retries >= maxRetries) {
    console.error(`💥 Max retries for token ${assetTokenId}—aborting. Check token validity.`);
    return;
  }

  if (clobConnections.has(key)) {
    console.log(`Already subbed to asset ${assetTokenId}`);
    return;
  }

  const ws = new WebSocket(`${CLOB_WS_HOST}/ws/market`);

  ws.on('open', () => {
    console.log(`✅ CLOB WS Open for asset ${assetTokenId}`);
    // Correct sub JSON per docs: type + assets_ids (tokenID array)
    const subscribeMsg = {
      type: 'MARKET',
      assets_ids: [assetTokenId]  // Array of tokenIDs for events
    };
    ws.send(JSON.stringify(subscribeMsg));
    console.log('📡 Sub msg sent:', JSON.stringify(subscribeMsg));
  });

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());
      console.log('🔥 CLOB Event Raw:', JSON.stringify(event, null, 2));
      const eventType = event.event_type || event.type;
      const payload = event;

      // Broadcast
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: eventType, payload, timestamp: Date.now() }));
        }
      });

      // Alerts (docs schema)
      if (eventType === 'price_change') {
        const changes = payload.price_changes || [];
        changes.forEach(change => {
          const newPrice = change.price;
          console.log(`💥 Price Change: ${newPrice} (best_bid: ${change.best_bid || 'N/A'}, best_ask: ${change.best_ask || 'N/A'})`);
          if (parseFloat(newPrice) > 0.75) console.log(`🚨 Alert >0.75 on ${change.asset_id}!`);
        });
      } else if (eventType === 'book') {
        const bids = payload.bids || [];
        const asks = payload.asks || [];
        console.log(`📊 Book Update: ${bids.length} bids, ${asks.length} asks (top bid: ${bids[0]?.price || 'N/A'})`);
      } else if (eventType === 'last_trade_price') {
        console.log(`💰 Trade: ${payload.price} @ ${payload.size} (${payload.side})`);
      }
      retryCounts.set(key, 0);  // Success reset
    } catch (err) {
      console.error('CLOB Parse Error:', err);
    }
  });

  ws.on('error', (err) => {
    console.error(`❌ CLOB Error for ${assetTokenId}:`, err.message);
    clobConnections.delete(key);
    retryCounts.set(key, retries + 1);
  });

  ws.on('close', (code, reason) => {
    console.log(`🔌 CLOB Closed for ${assetTokenId} (Code: ${code}, Reason: "${reason || 'Empty'}")`);
    clobConnections.delete(key);
    retryCounts.set(key, retries + 1);
    if (code === 1006 && retries < maxRetries) {
      console.log(`🔄 Reconnecting (Retry ${retries + 1}/${maxRetries})`);
      setTimeout(() => connectCLOBWebSocket(tokenId, maxRetries), 5000);
    } else if (code === 1006) {
      console.error(`💥 Permanent fail for ${assetTokenId}—try fresh tokenID from Gamma.`);
    }
  });

  clobConnections.set(key, ws);
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

  // Also clean up comment subscriptions
  if (clientCommentSubscriptions.has(clientId)) {
    const eventIds = clientCommentSubscriptions.get(clientId);
    eventIds.forEach(eventId => {
      unsubscribeClientFromComments(clientId, eventId);
    });
    clientCommentSubscriptions.delete(clientId);
  }

  console.log(`👋 Client ${clientId} disconnected`);
}

/**
 * Connect to Polymarket RTDS WebSocket for live comments
 */
function connectRTDS() {
  if (rtdsConnection && rtdsConnection.readyState === WebSocket.OPEN) {
    console.log('⚡ RTDS already connected');
    return;
  }

  console.log('🔌 Connecting to Polymarket RTDS for live comments...');
  rtdsConnection = new WebSocket(RTDS_WS_HOST);

  rtdsConnection.on('open', () => {
    console.log('✅ RTDS WebSocket connected');

    // Re-subscribe to any existing comment subscriptions
    commentSubscriptions.forEach((clientIds, eventId) => {
      if (clientIds.size > 0) {
        sendRTDSSubscription(eventId, 'subscribe');
      }
    });
  });

  rtdsConnection.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('💬 RTDS Message:', JSON.stringify(message).slice(0, 200));

      // Handle comment events
      if (message.type === 'comment_created' || message.type === 'comment_removed' ||
          message.type === 'reaction_created' || message.type === 'reaction_removed') {

        const eventId = message.data?.parentEntityID?.toString();
        if (eventId && commentSubscriptions.has(eventId)) {
          // Broadcast to all clients subscribed to this event's comments
          const clientIds = commentSubscriptions.get(eventId);
          broadcastToClients(clientIds, {
            type: message.type,
            payload: message.data,
            timestamp: Date.now()
          });
        }
      }
    } catch (err) {
      console.error('❌ RTDS parse error:', err.message);
    }
  });

  rtdsConnection.on('error', (err) => {
    console.error('❌ RTDS WebSocket error:', err.message);
  });

  rtdsConnection.on('close', (code, reason) => {
    console.log(`🔌 RTDS WebSocket closed (${code}): ${reason || 'No reason'}`);
    rtdsConnection = null;

    // Reconnect after 5 seconds if we have active subscriptions
    if (commentSubscriptions.size > 0) {
      console.log('🔄 Reconnecting RTDS in 5 seconds...');
      setTimeout(connectRTDS, 5000);
    }
  });
}

/**
 * Send subscription message to RTDS
 */
function sendRTDSSubscription(eventId, action = 'subscribe') {
  if (!rtdsConnection || rtdsConnection.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ RTDS not connected, cannot send subscription');
    return;
  }

  const subscriptionMsg = {
    action: action,
    subscriptions: [
      {
        topic: 'comments',
        type: '*', // All comment types
        filters: JSON.stringify({
          parentEntityID: parseInt(eventId, 10),
          parentEntityType: 'Event'
        })
      }
    ]
  };

  rtdsConnection.send(JSON.stringify(subscriptionMsg));
  console.log(`📡 RTDS ${action} sent for event ${eventId}`);
}

/**
 * Subscribe client to comments for an event
 */
function subscribeClientToComments(clientId, eventId) {
  // Add to client's comment subscriptions
  if (!clientCommentSubscriptions.has(clientId)) {
    clientCommentSubscriptions.set(clientId, new Set());
  }
  clientCommentSubscriptions.get(clientId).add(eventId);

  // Add to event's subscribers
  const isNewSubscription = !commentSubscriptions.has(eventId);
  if (!commentSubscriptions.has(eventId)) {
    commentSubscriptions.set(eventId, new Set());
  }
  commentSubscriptions.get(eventId).add(clientId);

  // Connect to RTDS if not already connected
  if (!rtdsConnection || rtdsConnection.readyState !== WebSocket.OPEN) {
    connectRTDS();
  } else if (isNewSubscription) {
    // Send subscription for this event
    sendRTDSSubscription(eventId, 'subscribe');
  }

  console.log(`✅ Client ${clientId} subscribed to comments for event ${eventId}`);
}

/**
 * Unsubscribe client from comments for an event
 */
function unsubscribeClientFromComments(clientId, eventId) {
  // Remove from client's subscriptions
  if (clientCommentSubscriptions.has(clientId)) {
    clientCommentSubscriptions.get(clientId).delete(eventId);
  }

  // Remove from event's subscribers
  if (commentSubscriptions.has(eventId)) {
    commentSubscriptions.get(eventId).delete(clientId);

    // If no more subscribers for this event, unsubscribe from RTDS
    if (commentSubscriptions.get(eventId).size === 0) {
      commentSubscriptions.delete(eventId);
      if (rtdsConnection && rtdsConnection.readyState === WebSocket.OPEN) {
        sendRTDSSubscription(eventId, 'unsubscribe');
      }
    }
  }

  console.log(`❌ Client ${clientId} unsubscribed from comments for event ${eventId}`);
}

/**
 * Broadcast message to specific client IDs
 */
function broadcastToClients(clientIds, message) {
  if (!wss) return;

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
    console.log(`📤 Broadcasted ${message.type} to ${sentCount} clients`);
  }
}

// Real tokenId from docs (active binary outcome)
const TOKEN_ID = '65818619657568813474341868652308942079804919287380422192892211131408793125422';

function getL2Headers(method, path) {
  if (!process.env.CLOB_SECRET) {
    console.error('❌ CLOB_SECRET not set! Current env:', {
      CLOB_API_KEY: process.env.CLOB_API_KEY ? 'SET' : 'MISSING',
      CLOB_SECRET: process.env.CLOB_SECRET ? 'SET' : 'MISSING',
      CLOB_PASSPHRASE: process.env.CLOB_PASSPHRASE ? 'SET' : 'MISSING'
    });
    throw new Error('Missing CLOB_SECRET in .env - set from derived creds');
  }

  const timestamp = Date.now().toString();
  const payload = timestamp + method.toUpperCase() + path;  // No body for GET
  const signature = crypto.createHmac('sha256', process.env.CLOB_SECRET).update(payload).digest('hex');

  return {
    'POLY_API_KEY': process.env.CLOB_API_KEY || '',  // Empty string if undefined
    'POLY_PASSPHRASE': process.env.CLOB_PASSPHRASE,
    'POLY_TIMESTAMP': timestamp,
    'POLY_SIGNATURE': signature,
    'POLY_ADDRESS': process.env.POLY_ADDRESS,
    'Content-Type': 'application/json'
  };
}

// Poll using official Polymarket client
async function pollMarketData(tokenId) {
  if (!clobClient) {
    console.warn('⚠️ Skipping poll - client not initialized yet');
    return;
  }

  try {
    // Get order book using official client
    const orderBook = await clobClient.getOrderBook(tokenId);
    const bookEvent = { type: 'book', payload: orderBook };

    // Get recent trades using official client
    const trades = await clobClient.getTrades(tokenId);
    const tradesEvent = { type: 'trades', payload: trades };

    // Calculate price from order book
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];
    const midpoint = (parseFloat(asks[0]?.price || 0) + parseFloat(bids[0]?.price || 0)) / 2;
    const priceEvent = { type: 'price_change', payload: { newPrice: midpoint.toFixed(4), best_bid: bids[0]?.price, best_ask: asks[0]?.price } };

    // Broadcast to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        [bookEvent, tradesEvent, priceEvent].forEach(ev => client.send(JSON.stringify(ev)));
      }
    });

    console.log(`📊 Polled ${tokenId.slice(0,10)}...: Book depth ${bids.length}/${asks.length}, Price ${midpoint.toFixed(4)}, Trades: ${trades.length || 0}`);

    if (parseFloat(priceEvent.payload.newPrice) > 0.75) console.log(`🚨 Poll Alert >0.75!`);
  } catch (err) {
    console.error('Poll Error:', err.message);
  }
}

// Start polling every 5 seconds
function startMarketPolling() {
  console.log('🔄 Starting REST API polling for live market data...');
  setInterval(() => pollMarketData(TOKEN_ID), POLLING_INTERVAL);
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

        // Handle both formats: {"type": "subscribe", "marketId": "..."} or {"subscribe": "tokenId"}
        let action = message.type;
        let marketId = message.marketId;

        // If no type field, check for subscribe/unsubscribe keys
        if (!action) {
          if (message.subscribe) {
            action = 'subscribe';
            marketId = message.subscribe;
          } else if (message.unsubscribe) {
            action = 'unsubscribe';
            marketId = message.unsubscribe;
          }
        }

        switch (action) {
          case 'subscribe':
            if (marketId) {
              subscribeClientToMarket(ws.id, marketId);
              ws.send(JSON.stringify({
                status: 'subscribed',
                tokenID: marketId
              }));
            } else {
              ws.send(JSON.stringify({ error: 'Missing marketId for subscribe' }));
            }
            break;

          case 'unsubscribe':
            if (marketId) {
              unsubscribeClientFromMarket(ws.id, marketId);
              ws.send(JSON.stringify({
                status: 'unsubscribed',
                tokenID: marketId
              }));
            } else {
              ws.send(JSON.stringify({ error: 'Missing marketId for unsubscribe' }));
            }
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            break;

          case 'subscribe_comments':
            if (message.eventId) {
              subscribeClientToComments(ws.id, message.eventId.toString());
              ws.send(JSON.stringify({
                status: 'subscribed_comments',
                eventId: message.eventId
              }));
            } else {
              ws.send(JSON.stringify({ error: 'Missing eventId for subscribe_comments' }));
            }
            break;

          case 'unsubscribe_comments':
            if (message.eventId) {
              unsubscribeClientFromComments(ws.id, message.eventId.toString());
              ws.send(JSON.stringify({
                status: 'unsubscribed_comments',
                eventId: message.eventId
              }));
            } else {
              ws.send(JSON.stringify({ error: 'Missing eventId for unsubscribe_comments' }));
            }
            break;

          default:
            console.log(`📨 Unknown message type from ${ws.id}:`, action || 'undefined');
            ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
        ws.send(JSON.stringify({
          error: 'Invalid JSON format'
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
      connected: rtdsConnection && rtdsConnection.readyState === WebSocket.OPEN,
      commentSubscriptions: commentSubscriptions.size
    }
  };
}

/**
 * Graceful shutdown
 */
function shutdown() {
  console.log('🛑 Shutting down WebSocket service...');

  // Close RTDS connection
  if (rtdsConnection) {
    console.log('🔌 Closing RTDS connection');
    rtdsConnection.close();
    rtdsConnection = null;
  }

  // Close all CLOB connections
  clobConnections.forEach((ws, key) => {
    console.log(`🔌 Closing CLOB connection for ${key}`);
    ws.close();
  });
  clobConnections.clear();

  // Close all client connections
  if (wss) {
    wss.clients.forEach(client => client.close());
    wss.close();
  }

  console.log('✅ Shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Initialize services
if (require.main === module) {
  console.log('🔥 Starting Polymarket CLOB WebSocket Service');

  // Initialize official Polymarket client
  (async () => {
    try {
      if (!process.env.CLOB_API_KEY || !process.env.CLOB_SECRET || !process.env.CLOB_PASSPHRASE) {
        throw new Error('CLOB credentials not configured in .env. Please set CLOB_API_KEY, CLOB_SECRET, and CLOB_PASSPHRASE');
      }

      console.log('🔑 Initializing Polymarket client with existing credentials...');
      console.log('Debug - CLOB_API_KEY:', process.env.CLOB_API_KEY ? 'SET' : 'MISSING');
      console.log('Debug - CLOB_SECRET:', process.env.CLOB_SECRET ? 'SET' : 'MISSING');
      console.log('Debug - CLOB_PASSPHRASE:', process.env.CLOB_PASSPHRASE ? 'SET' : 'MISSING');

      // Initialize official Polymarket client with existing credentials
      // Constructor: new ClobClient(host, key, chainId)
      clobClient = new ClobClient('https://clob.polymarket.com', process.env.CLOB_API_KEY, 137);
      console.log('✅ Official Polymarket client initialized');

      // Initialize WebSocket server
      initializeWebSocketServer();

      // Start REST API polling for live data (AFTER credentials are set)
      startMarketPolling();

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
  unsubscribeClientFromMarket,
  subscribeClientToComments,
  unsubscribeClientFromComments,
  connectRTDS
};

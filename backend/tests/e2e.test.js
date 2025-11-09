const request = require('supertest');
const nock = require('nock');

// Import our trading service
const { app } = require('../trading_service');

describe('End-to-End Trading Lifecycle', () => {
  let mockSafeAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

  beforeAll(() => {
    // Mock all external API calls
    nock('https://gamma-api.polymarket.com')
      .get('/markets/516710')
      .reply(200, {
        id: '516710',
        clobTokenIds: ['0xYesToken', '0xNoToken'],
        enableOrderBook: true,
        conditionId: '0xMockCondition',
        active: true
      })
      .persist();

    nock('https://relayer-v2.polymarket.com')
      .post('/execute')
      .reply(200, {
        state: 'STATE_CONFIRMED',
        hash: '0xMockTransactionHash'
      })
      .persist();

    // Mock USDC contract calls for position queries
    nock('https://polygon-rpc.com')
      .post('/', (body) => body.method === 'eth_call')
      .reply(200, {
        jsonrpc: '2.0',
        id: 1,
        result: '0x00000000000000000000000000000000000000000000000000000000000003e8' // 1000 USDC
      })
      .persist();
  });

  afterAll(() => {
    nock.cleanAll();
  });

  it('should complete full trading lifecycle: deploy → approve → trade → positions → redeem', async () => {
    // Step 1: Deploy Safe Wallet
    console.log('🧪 Testing Safe deployment...');
    const deployResponse = await request(app)
      .post('/deploy-safe')
      .send({
        userPrivateKey: '0x1234567890123456789012345678901234567890123456789012345678901234'
      })
      .expect(200);

    expect(deployResponse.body.success).toBe(true);
    expect(deployResponse.body.safeAddress).toBeDefined();
    const safeAddress = deployResponse.body.safeAddress;
    console.log(`✅ Safe deployed: ${safeAddress}`);

    // Step 2: Approve USDC
    console.log('🧪 Testing USDC approval...');
    const approveResponse = await request(app)
      .post('/approve-usdc')
      .send({
        safeAddress: safeAddress,
        amount: '1000'
      })
      .expect(200);

    expect(approveResponse.body.success).toBe(true);
    expect(approveResponse.body.transactionHash).toBeDefined();
    console.log(`✅ USDC approved: ${approveResponse.body.transactionHash}`);

    // Step 3: Place Order
    console.log('🧪 Testing order placement...');
    const orderResponse = await request(app)
      .post('/place-order')
      .send({
        safeAddress: safeAddress,
        marketId: '516710',
        side: 'buy',
        size: 10,
        price: 0.55,
        outcome: 'Yes'
      })
      .expect(200);

    expect(orderResponse.body.success).toBe(true);
    expect(orderResponse.body.orderId).toBeDefined();
    console.log(`✅ Order placed: ${orderResponse.body.orderId}`);

    // Step 4: Check Positions
    console.log('🧪 Testing position tracking...');
    const positionsResponse = await request(app)
      .get(`/positions/${safeAddress}`)
      .expect(200);

    expect(positionsResponse.body.success).toBe(true);
    expect(positionsResponse.body).toHaveProperty('usdcBalance');
    expect(positionsResponse.body).toHaveProperty('positions');
    expect(positionsResponse.body).toHaveProperty('pnl');
    console.log(`✅ Positions retrieved: ${positionsResponse.body.usdcBalance} USDC`);

    // Step 5: Redeem Position (mock redemption)
    console.log('🧪 Testing position redemption...');
    const redeemResponse = await request(app)
      .post('/redeem-position')
      .send({
        safeAddress: safeAddress,
        tokenIds: ['0xYesToken'],
        amounts: [10]
      })
      .expect(200);

    expect(redeemResponse.body.success).toBe(true);
    expect(redeemResponse.body.transactionHash).toBeDefined();
    console.log(`✅ Position redeemed: ${redeemResponse.body.transactionHash}`);

  }, 30000); // 30 second timeout for E2E test

  it('should handle error scenarios gracefully', async () => {
    // Test invalid market
    const invalidMarketResponse = await request(app)
      .post('/place-order')
      .send({
        safeAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
        marketId: 'invalid',
        side: 'buy',
        size: 10,
        price: 0.55,
        outcome: 'Yes'
      })
      .expect(500);

    expect(invalidMarketResponse.body.success).toBe(false);
    expect(invalidMarketResponse.body.error).toBeDefined();
  });

  it('should validate input parameters', async () => {
    // Test missing required fields
    const missingFieldsResponse = await request(app)
      .post('/place-order')
      .send({
        safeAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
        // Missing marketId, side, size, price, outcome
      })
      .expect(400);

    expect(missingFieldsResponse.body.success).toBe(false);
    expect(missingFieldsResponse.body.error).toContain('Missing required parameters');
  });
});

const request = require('supertest');
const express = require('express');
const nock = require('nock');

// Import our trading service
const { app } = require('../trading_service');

describe('Trading Endpoints', () => {
  beforeAll(() => {
    // Mock Gamma API responses
    nock('https://gamma-api.polymarket.com')
      .get('/markets/516710')
      .reply(200, {
        id: '516710',
        clobTokenIds: ['0xYesToken', '0xNoToken'],
        enableOrderBook: true,
        conditionId: '0xMockCondition',
        active: true
      })
      .get('/markets/999')
      .reply(200, {
        id: '999',
        clobTokenIds: ['0xYesTokenAMM', '0xNoTokenAMM'],
        enableOrderBook: false,
        conditionId: '0xMockConditionAMM',
        active: true
      });

    // Mock Relayer responses
    nock('https://relayer-v2.polymarket.com')
      .post('/execute')
      .reply(200, {
        state: 'STATE_CONFIRMED',
        hash: '0xMockTransactionHash'
      });
  });

  afterAll(() => {
    nock.cleanAll();
  });

  describe('POST /place-order', () => {
    it('should place a CLOB buy order successfully', async () => {
      const response = await request(app)
        .post('/place-order')
        .send({
          safeAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          marketId: '516710',
          side: 'buy',
          size: 10,
          price: 0.55,
          outcome: 'Yes'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.orderId).toBeDefined();
    });

    it('should handle AMM fallback for markets without order books', async () => {
      const response = await request(app)
        .post('/place-order')
        .send({
          safeAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          marketId: '999',
          side: 'buy',
          size: 5,
          price: 0.6,
          outcome: 'No'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.type).toBe('amm_split');
      expect(response.body.outcome).toBe('No');
    });

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/place-order')
        .send({
          // Missing required fields
          safeAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required parameters');
    });
  });

  describe('GET /positions/:safeAddress', () => {
    it('should return position data', async () => {
      const response = await request(app)
        .get('/positions/0x742d35Cc6634C0532925a3b844Bc454e4438f44e')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('usdcBalance');
      expect(response.body).toHaveProperty('positions');
      expect(response.body).toHaveProperty('pnl');
    });
  });

  describe('GET /health', () => {
    it('should return service health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('Polymarket Builder Trading Service');
      expect(response.body).toHaveProperty('clients');
    });
  });
});

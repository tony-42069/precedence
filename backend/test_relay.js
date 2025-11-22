/**
 * Test RelayClient initialization to fix "Cannot read properties of undefined (reading 'config')" error
 */

require('dotenv').config({ path: './.env' });
const { RelayClient } = require('@polymarket/builder-relayer-client');
const { ethers } = require('ethers');

async function testRelayClient() {
  console.log('🧪 Testing RelayClient initialization...\n');

  try {
    // Get private key from env
    const POLYMARKET_PRIVATE_KEY = process.env.POLYMARKET_PRIVATE_KEY;
    console.log('POLYMARKET_PRIVATE_KEY:', POLYMARKET_PRIVATE_KEY ? '✅ Set' : '❌ Missing');

    if (!POLYMARKET_PRIVATE_KEY) {
      throw new Error('POLYMARKET_PRIVATE_KEY not found in environment');
    }

    // Test 1: Try with JsonRpcProvider (current approach)
    console.log('\n📝 Test 1: Using JsonRpcProvider...');
    try {
      const provider1 = new ethers.JsonRpcProvider('https://polygon-rpc.com');
      const privateKey1 = POLYMARKET_PRIVATE_KEY.startsWith('0x')
        ? POLYMARKET_PRIVATE_KEY.slice(2)
        : POLYMARKET_PRIVATE_KEY;
      const wallet1 = new ethers.Wallet(privateKey1, provider1);
      
      console.log('Wallet address:', wallet1.address);
      console.log('Wallet config:', typeof wallet1.config, wallet1.config);
      
      const relayClient1 = new RelayClient(
        'https://relayer-v2.polymarket.com/',
        137,
        wallet1
      );
      
      console.log('✅ Test 1 PASSED: RelayClient initialized with JsonRpcProvider');
    } catch (error) {
      console.error('❌ Test 1 FAILED:', error.message);
    }

    // Test 2: Try without removing 0x prefix
    console.log('\n📝 Test 2: Using private key with 0x prefix...');
    try {
      const provider2 = new ethers.JsonRpcProvider('https://polygon-rpc.com');
      const wallet2 = new ethers.Wallet(POLYMARKET_PRIVATE_KEY, provider2);
      
      console.log('Wallet address:', wallet2.address);
      
      const relayClient2 = new RelayClient(
        'https://relayer-v2.polymarket.com/',
        137,
        wallet2
      );
      
      console.log('✅ Test 2 PASSED: RelayClient initialized with 0x prefix');
    } catch (error) {
      console.error('❌ Test 2 FAILED:', error.message);
    }

    // Test 3: Try with different RPC provider
    console.log('\n📝 Test 3: Using different RPC provider (Alchemy)...');
    try {
      const provider3 = new ethers.JsonRpcProvider('https://polygon-mainnet.g.alchemy.com/v2/demo');
      const wallet3 = new ethers.Wallet(POLYMARKET_PRIVATE_KEY, provider3);
      
      console.log('Wallet address:', wallet3.address);
      
      const relayClient3 = new RelayClient(
        'https://relayer-v2.polymarket.com/',
        137,
        wallet3
      );
      
      console.log('✅ Test 3 PASSED: RelayClient initialized with Alchemy RPC');
    } catch (error) {
      console.error('❌ Test 3 FAILED:', error.message);
    }

    // Test 4: Check if wallet needs to be connected to provider
    console.log('\n📝 Test 4: Wallet without provider (signer only)...');
    try {
      const wallet4 = new ethers.Wallet(POLYMARKET_PRIVATE_KEY);
      
      console.log('Wallet address:', wallet4.address);
      console.log('Has provider:', !!wallet4.provider);
      
      const relayClient4 = new RelayClient(
        'https://relayer-v2.polymarket.com/',
        137,
        wallet4
      );
      
      console.log('✅ Test 4 PASSED: RelayClient initialized without provider');
    } catch (error) {
      console.error('❌ Test 4 FAILED:', error.message);
    }

    // Test 5: Try connecting wallet after creation
    console.log('\n📝 Test 5: Wallet connected to provider after creation...');
    try {
      const provider5 = new ethers.JsonRpcProvider('https://polygon-rpc.com');
      const wallet5 = new ethers.Wallet(POLYMARKET_PRIVATE_KEY);
      const connectedWallet = wallet5.connect(provider5);
      
      console.log('Wallet address:', connectedWallet.address);
      console.log('Has provider:', !!connectedWallet.provider);
      
      const relayClient5 = new RelayClient(
        'https://relayer-v2.polymarket.com/',
        137,
        connectedWallet
      );
      
      console.log('✅ Test 5 PASSED: RelayClient initialized with connected wallet');
    } catch (error) {
      console.error('❌ Test 5 FAILED:', error.message);
    }

    console.log('\n✅ Testing complete!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    console.error('Stack trace:', error.stack);
  }
}

testRelayClient();

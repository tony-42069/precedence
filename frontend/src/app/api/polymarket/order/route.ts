/**
 * Polymarket Order API Route
 * 
 * Creates and submits orders to Polymarket CLOB API server-side.
 * This avoids CORS issues since the request comes from our server.
 * 
 * The order is signed client-side, then submitted server-side.
 */

import { NextRequest, NextResponse } from 'next/server';

const CLOB_API_URL = 'https://clob.polymarket.com';

interface OrderRequest {
  // Signed order data from client
  order: {
    salt: string;
    maker: string;
    signer: string;
    taker: string;
    tokenId: string;
    makerAmount: string;
    takerAmount: string;
    expiration: string;
    nonce: string;
    feeRateBps: string;
    side: string;
    signatureType: number;
    signature: string;
  };
  // Owner address (Safe address)
  owner: string;
  // Order type
  orderType: 'GTC' | 'FOK' | 'GTD';
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderRequest = await request.json();
    const { order, owner, orderType } = body;

    if (!order || !owner) {
      return NextResponse.json(
        { error: 'Missing order or owner' },
        { status: 400 }
      );
    }

    console.log('📤 Submitting order to Polymarket:', {
      tokenId: order.tokenId,
      side: order.side,
      maker: order.maker,
      owner,
      orderType,
    });

    // Submit order to Polymarket CLOB
    const response = await fetch(`${CLOB_API_URL}/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order,
        owner,
        orderType,
      }),
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log('📥 Polymarket response:', response.status, responseData);

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: responseData.error || 'Order submission failed',
          details: responseData,
          status: response.status,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      ...responseData,
    });

  } catch (error: any) {
    console.error('❌ Order submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit order' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/polymarket/order',
    description: 'Server-side order submission to Polymarket CLOB',
  });
}

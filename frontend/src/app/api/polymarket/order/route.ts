/**
 * Polymarket Order API Route
 * 
 * Submits orders to Polymarket CLOB API server-side with proper authentication.
 * This avoids CORS issues since the request comes from our server.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const CLOB_API_URL = 'https://clob.polymarket.com';

interface OrderRequest {
  order: any;
  owner: string;
  orderType: 'GTC' | 'FOK' | 'GTD';
  credentials?: {
    key: string;
    secret: string;
    passphrase: string;
  };
}

/**
 * Build HMAC signature for Polymarket API authentication
 */
function buildHmacSignature(
  secret: string,
  timestamp: number,
  method: string,
  path: string,
  body: string = ''
): string {
  const message = `${timestamp}${method}${path}${body}`;
  const hmac = crypto.createHmac('sha256', Buffer.from(secret, 'base64'));
  hmac.update(message);
  return hmac.digest('base64');
}

export async function POST(request: NextRequest) {
  try {
    const body: OrderRequest = await request.json();
    const { order, owner, orderType, credentials } = body;

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
      hasCredentials: !!credentials,
    });

    // Prepare the order payload
    const orderPayload = {
      order,
      owner,
      orderType,
    };

    const payloadString = JSON.stringify(orderPayload);
    const timestamp = Math.floor(Date.now() / 1000);
    const path = '/order';
    const method = 'POST';

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API authentication headers if credentials provided
    if (credentials?.key && credentials?.secret && credentials?.passphrase) {
      const signature = buildHmacSignature(
        credentials.secret,
        timestamp,
        method,
        path,
        payloadString
      );

      headers['POLY_ADDRESS'] = owner;
      headers['POLY_API_KEY'] = credentials.key;
      headers['POLY_PASSPHRASE'] = credentials.passphrase;
      headers['POLY_TIMESTAMP'] = timestamp.toString();
      headers['POLY_SIGNATURE'] = signature;

      console.log('🔐 Added API authentication headers');
    } else {
      console.log('⚠️ No credentials provided, submitting without API auth');
    }

    // Submit order to Polymarket CLOB
    const response = await fetch(`${CLOB_API_URL}${path}`, {
      method,
      headers,
      body: payloadString,
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

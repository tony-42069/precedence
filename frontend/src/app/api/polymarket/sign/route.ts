/**
 * Builder Signing API Route
 * 
 * This endpoint generates HMAC signatures for Polymarket Builder attribution.
 * Builder credentials are kept server-side for security.
 * 
 * The frontend calls this when initializing RelayClient or ClobClient
 * with builder config for order attribution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { buildHmacSignature, BuilderApiKeyCreds } from '@polymarket/builder-signing-sdk';

// Builder credentials from environment variables
const BUILDER_CREDENTIALS: BuilderApiKeyCreds = {
  key: process.env.POLYMARKET_BUILDER_API_KEY!,
  secret: process.env.POLYMARKET_BUILDER_SECRET!,
  passphrase: process.env.POLYMARKET_BUILDER_PASSPHRASE!,
};

export async function POST(request: NextRequest) {
  try {
    // Validate credentials are configured
    if (!BUILDER_CREDENTIALS.key || !BUILDER_CREDENTIALS.secret || !BUILDER_CREDENTIALS.passphrase) {
      console.error('❌ Builder credentials not configured');
      return NextResponse.json(
        { error: 'Builder credentials not configured' },
        { status: 500 }
      );
    }

    // Parse request body
    const { method, path, body } = await request.json();

    if (!method || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters: method, path' },
        { status: 400 }
      );
    }

    // Generate timestamp
    const sigTimestamp = Date.now().toString();

    // Build HMAC signature
    const signature = buildHmacSignature(
      BUILDER_CREDENTIALS.secret,
      parseInt(sigTimestamp),
      method,
      path,
      body || ''
    );

    console.log(`🔐 Builder signature generated for: ${method} ${path}`);

    // Return the headers needed for builder attribution
    return NextResponse.json({
      POLY_BUILDER_SIGNATURE: signature,
      POLY_BUILDER_TIMESTAMP: sigTimestamp,
      POLY_BUILDER_API_KEY: BUILDER_CREDENTIALS.key,
      POLY_BUILDER_PASSPHRASE: BUILDER_CREDENTIALS.passphrase,
    });

  } catch (error) {
    console.error('❌ Builder signing error:', error);
    return NextResponse.json(
      { error: 'Failed to generate builder signature' },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const hasCredentials = !!(
    BUILDER_CREDENTIALS.key && 
    BUILDER_CREDENTIALS.secret && 
    BUILDER_CREDENTIALS.passphrase
  );

  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/polymarket/sign',
    credentialsConfigured: hasCredentials,
  });
}

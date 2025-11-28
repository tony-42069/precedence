'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { polygon, mainnet } from 'viem/chains';

const PRIVY_APP_ID = 'cmii5u5hj089jjr0c9q37ptmk';

export function PrivyTestProvider({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        // Login methods to offer
        loginMethods: ['email', 'google', 'wallet'],
        
        // Appearance customization
        appearance: {
          theme: 'dark',
          accentColor: '#0052FF',
          logo: '/app/precedence-logo-transparent.png',
        },
        
        // Embedded wallet configuration - CORRECT FORMAT FROM DOCS
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',  // Auto-create for ALL users
          },
        },
        
        // Default to Polygon (required for Polymarket)
        defaultChain: polygon,
        
        // Supported chains
        supportedChains: [polygon, mainnet],
      }}
    >
      {children}
    </PrivyProvider>
  );
}

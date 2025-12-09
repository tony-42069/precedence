'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { ReactNode } from 'react';

interface PrivyClientProviderProps {
  children: ReactNode;
}

export default function PrivyClientProvider({ children }: PrivyClientProviderProps) {
  return (
    <PrivyProvider
      appId="cmii5u5hj089jjr0c9q37ptmk"
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#0052FF',
          logo: '/app/precedence-logo-transparent.png',
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'all-users',
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}

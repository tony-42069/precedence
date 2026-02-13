'use client';

import type { Metadata } from "next";
import { Suspense } from 'react';
import "./globals.css";
import { PrivyProvider } from '@privy-io/react-auth';
import { UserProvider } from "../contexts/UserContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>Precedence | Trade the Signal</title>
        <meta name="description" content="AI-powered prediction market trading. Our AI estimates true probabilities, detects mispricing, and shows you the edge." />
        <link rel="icon" href="/app/precedence-logo-transparent.png" type="image/png" />
        <link rel="apple-touch-icon" href="/app/precedence-logo-transparent.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500&family=Instrument+Serif:ital@0;1&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
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
          <UserProvider>
            <Suspense fallback={<div className="min-h-screen bg-[#030304] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
              {children}
            </Suspense>
          </UserProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}

'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PrivyProvider } from '@privy-io/react-auth';
import { UserProvider } from "../contexts/UserContext"; // <-- ADD THIS IMPORT

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <PrivyProvider
          appId="cmii5u5hj089jjr0c9q37ptmk"
          config={{
            loginMethods: ['email', 'google', 'wallet'],
            appearance: {
              theme: 'dark',
              accentColor: '#0052FF',
              logo: '/precedence-logo-transparent.png', // Add your logo
            },
            embeddedWallets: {
              ethereum: {
                createOnLogin: 'all-users', // Auto-create wallets for everyone
              },
            },
          }}
        >
          <UserProvider>
            {children}
          </UserProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}

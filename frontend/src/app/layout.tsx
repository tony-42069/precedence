'use client';

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from 'react';
import "./globals.css";
import { PrivyProvider } from '@privy-io/react-auth';
import { UserProvider } from "../contexts/UserContext";

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

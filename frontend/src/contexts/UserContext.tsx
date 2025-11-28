'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { userService, UserProfile, Position, UserStats } from '../services/userService';

interface UserContextType {
  // User profile state
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearUser: () => void;
  
  // Portfolio data
  positions: Position[];
  stats: UserStats | null;
  fetchPositions: () => Promise<void>;
  fetchStats: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: privyUser, authenticated, ready } = usePrivy();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Register user when Privy authenticates
   */
  const registerUser = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const profile = await userService.registerUser(walletAddress);
      setUser(profile);
      
      // Store wallet address for session recovery
      if (typeof window !== 'undefined') {
        localStorage.setItem('precedence_wallet', walletAddress);
      }
      
      console.log('✅ User profile loaded:', profile.wallet_address);
    } catch (err: any) {
      const message = err.message || 'Failed to load user profile';
      setError(message);
      console.error('❌ User registration failed:', message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Auto-register when Privy user has wallet
   */
  useEffect(() => {
    if (ready && authenticated && privyUser?.wallet?.address && !user) {
      console.log('🔐 Privy authenticated, registering user...');
      registerUser(privyUser.wallet.address);
    }
  }, [ready, authenticated, privyUser?.wallet?.address, user, registerUser]);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user || !privyUser?.wallet?.address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Transform data: convert null to undefined for backend compatibility
      const transformedData: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (value !== null) { // Only include non-null values
          transformedData[key] = value;
        }
      }
      
      const updated = await userService.updateProfile(privyUser.wallet.address, transformedData);
      setUser(updated);
      console.log('✅ Profile updated');
    } catch (err: any) {
      const message = err.message || 'Failed to update profile';
      setError(message);
      console.error('❌ Profile update failed:', message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [user, privyUser?.wallet?.address]);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    if (!user || !privyUser?.wallet?.address) return;
    
    try {
      const profile = await userService.getProfile(privyUser.wallet.address);
      setUser(profile);
    } catch (err: any) {
      console.error('❌ Failed to refresh user:', err.message);
    }
  }, [user, privyUser?.wallet?.address]);

  /**
   * Clear user data (on logout)
   */
  const clearUser = useCallback(() => {
    setUser(null);
    setPositions([]);
    setStats(null);
    setError(null);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('precedence_wallet');
    }
    
    console.log('🔌 User disconnected');
  }, []);

  /**
   * Fetch user's positions
   */
  const fetchPositions = useCallback(async () => {
    if (!user || !privyUser?.wallet?.address) return;
    
    try {
      const data = await userService.getPositions(privyUser.wallet.address);
      setPositions(data);
    } catch (err: any) {
      console.error('❌ Failed to fetch positions:', err.message);
    }
  }, [user, privyUser?.wallet?.address]);

  /**
   * Fetch user's stats
   */
  const fetchStats = useCallback(async () => {
    if (!user || !privyUser?.wallet?.address) return;
    
    try {
      const data = await userService.getStats(privyUser.wallet.address);
      setStats(data);
    } catch (err: any) {
      console.error('❌ Failed to fetch stats:', err.message);
    }
  }, [user, privyUser?.wallet?.address]);

  const value: UserContextType = {
    user,
    isLoading,
    error,
    updateProfile,
    refreshUser,
    clearUser,
    positions,
    stats,
    fetchPositions,
    fetchStats,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access user context
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

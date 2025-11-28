'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { userService, UserProfile, Position, UserStats } from '../services/userService';

interface UserContextType {
  // User profile state
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  registerOrFetchUser: (walletAddress: string) => Promise<UserProfile | null>;
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Register a new user or fetch existing profile
   * Called when wallet connects
   */
  const registerOrFetchUser = useCallback(async (walletAddress: string): Promise<UserProfile | null> => {
    if (!walletAddress) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // This endpoint handles both new and existing users
      const profile = await userService.registerUser(walletAddress);
      setUser(profile);
      
      // Store wallet address for session recovery
      if (typeof window !== 'undefined') {
        localStorage.setItem('precedence_wallet', walletAddress);
      }
      
      console.log('✅ User profile loaded:', profile.wallet_address);
      return profile;
    } catch (err: any) {
      const message = err.message || 'Failed to load user profile';
      setError(message);
      console.error('❌ User registration failed:', message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const updated = await userService.updateProfile(user.wallet_address, data);
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
  }, [user]);

  /**
   * Refresh user data from server
   */
  const refreshUser = useCallback(async () => {
    if (!user) return;
    
    try {
      const profile = await userService.getProfile(user.wallet_address);
      setUser(profile);
    } catch (err: any) {
      console.error('❌ Failed to refresh user:', err.message);
    }
  }, [user]);

  /**
   * Clear user data (on disconnect)
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
    if (!user) return;
    
    try {
      const data = await userService.getPositions(user.wallet_address);
      setPositions(data);
    } catch (err: any) {
      console.error('❌ Failed to fetch positions:', err.message);
    }
  }, [user]);

  /**
   * Fetch user's stats
   */
  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    try {
      const data = await userService.getStats(user.wallet_address);
      setStats(data);
    } catch (err: any) {
      console.error('❌ Failed to fetch stats:', err.message);
    }
  }, [user]);

  /**
   * Try to recover user session on mount
   */
  useEffect(() => {
    const recoverSession = async () => {
      if (typeof window === 'undefined') return;
      
      const savedWallet = localStorage.getItem('precedence_wallet');
      if (savedWallet && !user) {
        console.log('🔄 Recovering session for:', savedWallet);
        await registerOrFetchUser(savedWallet);
      }
    };
    
    recoverSession();
  }, []); // Only run once on mount

  const value: UserContextType = {
    user,
    isLoading,
    error,
    registerOrFetchUser,
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

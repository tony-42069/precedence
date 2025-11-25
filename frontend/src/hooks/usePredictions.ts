import { useState, useEffect, useCallback } from 'react';

export interface AIPrediction {
  predicted_outcome: string;
  confidence: number;
  judge_analysis?: {
    judge_bias?: string;
    judge_confidence_adjustment?: number;
  };
  model_version?: string;
}

export interface JudgeProfile {
  judge_id: string;
  profile_status?: string;
  statistics?: {
    case_types?: Record<string, number>;
    outcomes?: Record<string, number>;
  };
  writing_style?: any;
  topics?: any;
}

export interface MarketWithAI extends Market {
  ai_prediction?: AIPrediction;
  judge_profile?: JudgeProfile;
}

interface Market {
  id?: string;
  question?: string;
  description?: string;
  volume?: number;
  closed?: boolean;
  active?: boolean;
  tags?: string[];
  current_yes_price?: number;
  current_no_price?: number;
  title?: string;
  probability?: number;
  endDate?: string;
}

export function usePredictions() {
  const [predictions, setPredictions] = useState<Map<string, AIPrediction>>(new Map());
  const [judgeProfiles, setJudgeProfiles] = useState<Map<string, JudgeProfile>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const API_BASE = 'http://localhost:8000/api';

  // Get AI prediction for a market
  const getPrediction = useCallback(async (marketId: string, caseData?: any) => {
    if (!marketId) return null;

    setLoading(prev => new Set(prev).add(marketId));
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(marketId);
      return newErrors;
    });

    try {
      const response = await fetch(`${API_BASE}/predictions/case-outcome`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          case_id: marketId,
          case_data: caseData || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`Prediction API error: ${response.status}`);
      }

      const prediction: AIPrediction = await response.json();
      setPredictions(prev => new Map(prev).set(marketId, prediction));

      return prediction;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setErrors(prev => new Map(prev).set(marketId, errorMessage));
      console.error('Prediction fetch error:', error);
      return null;
    } finally {
      setLoading(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(marketId);
        return newLoading;
      });
    }
  }, [API_BASE]);

  // Get judge profile
  const getJudgeProfile = useCallback(async (judgeId: string) => {
    if (!judgeId) return null;

    // Check if we already have this profile
    if (judgeProfiles.has(judgeId)) {
      return judgeProfiles.get(judgeId);
    }

    setLoading(prev => new Set(prev).add(`judge_${judgeId}`));

    try {
      const response = await fetch(`${API_BASE}/predictions/judge/${judgeId}/profile`);

      if (!response.ok) {
        throw new Error(`Judge profile API error: ${response.status}`);
      }

      const profile: JudgeProfile = await response.json();
      setJudgeProfiles(prev => new Map(prev).set(judgeId, profile));

      return profile;
    } catch (error) {
      console.error('Judge profile fetch error:', error);
      return null;
    } finally {
      setLoading(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(`judge_${judgeId}`);
        return newLoading;
      });
    }
  }, [API_BASE, judgeProfiles]);

  // Get model status
  const getModelStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/predictions/models/status`);
      if (!response.ok) {
        throw new Error(`Model status API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Model status fetch error:', error);
      return null;
    }
  }, [API_BASE]);

  // Enhanced market data with AI predictions
  const enhanceMarketWithAI = useCallback(async (market: Market): Promise<MarketWithAI> => {
    const enhancedMarket: MarketWithAI = { ...market };

    // Only run AI analysis on legal/court-related markets
    const question = (market.question || market.title || '').toLowerCase();
    const tags = (market.tags || []).map(t => t.toLowerCase());
    
    const isLegalMarket = 
      question.includes('court') ||
      question.includes('scotus') ||
      question.includes('supreme') ||
      question.includes('judge') ||
      question.includes('ruling') ||
      question.includes('verdict') ||
      question.includes('lawsuit') ||
      question.includes('legal') ||
      question.includes('constitutional') ||
      question.includes('doj') ||
      question.includes('sec ') ||
      question.includes('fcc') ||
      question.includes('regulation') ||
      tags.some(t => ['legal', 'court', 'scotus', 'lawsuit', 'judicial'].includes(t));

    if (!isLegalMarket) {
      // Skip AI prediction for non-legal markets
      return enhancedMarket;
    }

    // Get AI prediction for this legal market
    const prediction = await getPrediction(market.id || '', {
      case_name: market.question || market.title,
      case_type: 'legal_market',
      market_data: {
        volume: market.volume,
        tags: market.tags,
      }
    });

    if (prediction) {
      enhancedMarket.ai_prediction = prediction;
    }

    return enhancedMarket;
  }, [getPrediction]);

  // Batch enhance multiple markets
  const enhanceMarketsWithAI = useCallback(async (markets: Market[]): Promise<MarketWithAI[]> => {
    const enhancedMarkets: MarketWithAI[] = [];

    // Process in batches to avoid overwhelming the API
    const batchSize = 3;
    for (let i = 0; i < markets.length; i += batchSize) {
      const batch = markets.slice(i, i + batchSize);
      const batchPromises = batch.map(market => enhanceMarketWithAI(market));
      const batchResults = await Promise.all(batchPromises);
      enhancedMarkets.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < markets.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enhancedMarkets;
  }, [enhanceMarketWithAI]);

  // Clear cache for a specific market
  const clearPrediction = useCallback((marketId: string) => {
    setPredictions(prev => {
      const newPredictions = new Map(prev);
      newPredictions.delete(marketId);
      return newPredictions;
    });
    setErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(marketId);
      return newErrors;
    });
  }, []);

  // Get prediction for a market (from cache or fetch)
  const getCachedPrediction = useCallback((marketId: string) => {
    return predictions.get(marketId) || null;
  }, [predictions]);

  // Check if prediction is loading
  const isLoadingPrediction = useCallback((marketId: string) => {
    return loading.has(marketId);
  }, [loading]);

  // Get prediction error
  const getPredictionError = useCallback((marketId: string) => {
    return errors.get(marketId) || null;
  }, [errors]);

  return {
    // Core functions
    getPrediction,
    getJudgeProfile,
    getModelStatus,
    enhanceMarketWithAI,
    enhanceMarketsWithAI,

    // Cache management
    clearPrediction,
    getCachedPrediction,

    // State
    predictions,
    judgeProfiles,
    loading,
    errors,

    // Helpers
    isLoadingPrediction,
    getPredictionError,
  };
}

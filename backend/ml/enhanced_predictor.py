"""
Enhanced Predictor for Precedence

Combines judge analysis with market prediction for superior AI insights.
"""

import logging
from typing import Dict, List, Any, Optional
from .judge_analyzer import get_judge_profiler, JudgeProfiler
from .market_prediction import get_market_predictor, MarketPredictor

logger = logging.getLogger(__name__)

class EnhancedPredictor:
    """
    Enhanced predictor that combines judge analysis with market prediction.

    This class provides comprehensive case outcome predictions by:
    1. Analyzing judge profiles and voting patterns
    2. Predicting case outcomes using ML models
    3. Combining both for superior accuracy
    """

    def __init__(self):
        self.judge_profiler = get_judge_profiler()
        self.market_predictor = get_market_predictor()
        logger.info("EnhancedPredictor initialized")

    def predict_case_with_judge_analysis(
        self,
        case_data: Dict[str, Any],
        judge_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Predict case outcome with comprehensive judge analysis.

        Args:
            case_data: Case information dictionary
            judge_id: Optional judge identifier for enhanced analysis

        Returns:
            Comprehensive prediction with judge insights
        """
        try:
            logger.info(f"Predicting case outcome with judge analysis for judge_id: {judge_id}")

            # Get basic market prediction
            market_prediction = self.market_predictor.predict_outcome_probabilities(case_data)

            # Initialize enhanced results
            enhanced_results = market_prediction.copy()

            # Add judge analysis if judge_id provided
            judge_analysis = {}
            if judge_id:
                judge_analysis = self._analyze_judge_for_case(judge_id, case_data)

                # Adjust prediction confidence based on judge analysis
                if "judge_confidence_adjustment" in judge_analysis:
                    adjustment = judge_analysis["judge_confidence_adjustment"]
                    original_confidence = enhanced_results.get("confidence", 0.5)
                    enhanced_results["confidence"] = min(1.0, max(0.0, original_confidence + adjustment))

                    # Update probabilities based on judge bias
                    if "judge_bias_outcome" in judge_analysis:
                        bias_outcome = judge_analysis["judge_bias_outcome"]
                        if bias_outcome in enhanced_results.get("probabilities", {}):
                            # Slightly boost the probability of judge's preferred outcome
                            current_prob = enhanced_results["probabilities"][bias_outcome]
                            enhanced_results["probabilities"][bias_outcome] = min(1.0, current_prob + 0.1)

                            # Renormalize probabilities
                            total_prob = sum(enhanced_results["probabilities"].values())
                            enhanced_results["probabilities"] = {
                                k: v / total_prob for k, v in enhanced_results["probabilities"].items()
                            }

            # Add judge analysis to results
            enhanced_results["judge_analysis"] = judge_analysis
            enhanced_results["model_version"] = "enhanced_predictor_v1.0"

            logger.info(f"Enhanced prediction completed: outcome={enhanced_results.get('predicted_outcome')}")
            return enhanced_results

        except Exception as e:
            logger.error(f"Error in enhanced prediction: {str(e)}")
            # Return fallback prediction
            return {
                "predicted_outcome": "UNKNOWN",
                "confidence": 0.5,
                "probabilities": {"PLAINTIFF_WIN": 0.5, "DEFENDANT_WIN": 0.5},
                "judge_analysis": {"error": f"Analysis failed: {str(e)}"},
                "model_version": "enhanced_predictor_fallback"
            }

    def _analyze_judge_for_case(
        self,
        judge_id: str,
        case_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze how a specific judge might rule on a case.

        Args:
            judge_id: Judge identifier
            case_data: Case information

        Returns:
            Judge-specific analysis
        """
        try:
            analysis = {
                "judge_id": judge_id,
                "analysis_type": "enhanced_judge_analysis"
            }

            # Try to load judge profile
            profile_path = f"{self.judge_profiler.model_dir}/judge_profile_{judge_id}.json"
            judge_profile = None

            try:
                import os
                if os.path.exists(profile_path):
                    import json
                    with open(profile_path, 'r') as f:
                        judge_profile = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load judge profile for {judge_id}: {e}")

            if judge_profile:
                # Extract judge statistics
                stats = judge_profile.get("statistics", {})
                outcomes = stats.get("outcomes", {})

                if outcomes:
                    # Calculate judge's historical tendencies
                    total_cases = sum(outcomes.values())
                    plaintiff_win_rate = outcomes.get("PLAINTIFF_WIN", 0) / total_cases
                    defendant_win_rate = outcomes.get("DEFENDANT_WIN", 0) / total_cases

                    analysis["historical_win_rates"] = {
                        "plaintiff": plaintiff_win_rate,
                        "defendant": defendant_win_rate
                    }

                    # Determine judge bias
                    if plaintiff_win_rate > defendant_win_rate:
                        analysis["judge_bias"] = "plaintiff_favorable"
                        analysis["judge_bias_outcome"] = "PLAINTIFF_WIN"
                        analysis["judge_confidence_adjustment"] = 0.1  # Boost confidence for plaintiff wins
                    elif defendant_win_rate > plaintiff_win_rate:
                        analysis["judge_bias"] = "defendant_favorable"
                        analysis["judge_bias_outcome"] = "DEFENDANT_WIN"
                        analysis["judge_confidence_adjustment"] = 0.1  # Boost confidence for defendant wins
                    else:
                        analysis["judge_bias"] = "neutral"
                        analysis["judge_confidence_adjustment"] = 0.0

                # Add writing style info if available
                writing_style = judge_profile.get("writing_style", {})
                if writing_style:
                    analysis["writing_style_cluster"] = writing_style.get("dominant_cluster", "unknown")

                # Add topic affinities if available
                topics = judge_profile.get("topics", {})
                if topics:
                    analysis["topic_affinities"] = topics.get("judge_affinities", {}).get(judge_id, [])

            else:
                # No profile available - use fallback analysis
                analysis["profile_status"] = "not_available"
                analysis["judge_confidence_adjustment"] = 0.0
                analysis["fallback_reason"] = "Judge profile not found in database"

            return analysis

        except Exception as e:
            logger.error(f"Error in judge analysis for case: {str(e)}")
            return {
                "judge_id": judge_id,
                "error": f"Judge analysis failed: {str(e)}",
                "judge_confidence_adjustment": 0.0
            }

    def get_judge_profile(self, judge_id: str) -> Dict[str, Any]:
        """
        Get comprehensive judge profile.

        Args:
            judge_id: Judge identifier

        Returns:
            Judge profile with statistics and analysis
        """
        try:
            # Try to load from saved profile first
            profile_path = f"{self.judge_profiler.model_dir}/judge_profile_{judge_id}.json"

            try:
                import os, json
                if os.path.exists(profile_path):
                    with open(profile_path, 'r') as f:
                        return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load saved profile for {judge_id}: {e}")

            # If no saved profile, return basic info
            return {
                "judge_id": judge_id,
                "profile_status": "not_available",
                "message": "Judge profile not found. Analysis available during case prediction."
            }

        except Exception as e:
            logger.error(f"Error getting judge profile: {str(e)}")
            return {
                "judge_id": judge_id,
                "error": f"Profile retrieval failed: {str(e)}"
            }

# Global enhanced predictor instance
_enhanced_predictor = None

def get_enhanced_predictor() -> EnhancedPredictor:
    """Get or create global enhanced predictor instance."""
    global _enhanced_predictor
    if _enhanced_predictor is None:
        _enhanced_predictor = EnhancedPredictor()
    return _enhanced_predictor

def predict_case_with_judge_analysis(
    case_data: Dict[str, Any],
    judge_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Convenience function for enhanced case prediction.

    Args:
        case_data: Case information
        judge_id: Optional judge identifier

    Returns:
        Enhanced prediction results
    """
    predictor = get_enhanced_predictor()
    return predictor.predict_case_with_judge_analysis(case_data, judge_id)

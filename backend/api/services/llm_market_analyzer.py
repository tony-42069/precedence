"""
LLM-based Market Analysis Service

Uses OpenAI GPT-4 to analyze prediction markets and provide trading insights.
Adapted from the legal case analyzer for general prediction markets.
"""

import os
import logging
from typing import Dict, Any, Optional
import json
from openai import OpenAI

logger = logging.getLogger(__name__)


class LLMMarketAnalyzer:
    """Analyzes prediction markets using OpenAI GPT-4."""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"  # Using GPT-4o (faster and cheaper than GPT-4)
        logger.info("LLMMarketAnalyzer initialized with GPT-4o")
    
    async def analyze_market(
        self,
        question: str,
        description: str,
        current_yes_price: float,
        current_no_price: float,
        volume: Optional[float] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None,
        outcomes: Optional[list] = None
    ) -> Dict[str, Any]:
        """
        Analyze a prediction market and return probability estimates with reasoning.
        
        Args:
            question: The market question (e.g., "Will Trump win 2024 election?")
            description: Market rules/resolution criteria
            current_yes_price: Current YES price (0-1)
            current_no_price: Current NO price (0-1)
            volume: Trading volume in USD
            end_date: Market end/resolution date
            category: Market category (Politics, Legal, Crypto, Economics)
            outcomes: For multi-outcome markets, list of outcome names
            
        Returns:
            Dict with AI probability estimate, reasoning, edge analysis, and confidence
        """
        
        logger.info(f"Analyzing market: {question[:50]}...")
        
        # Detect if this is a multi-outcome market
        is_multi_outcome = outcomes and len(outcomes) > 2
        
        # Build the prompt
        if is_multi_outcome:
            prompt = self._build_multi_outcome_prompt(
                question=question,
                description=description,
                outcomes=outcomes,
                volume=volume,
                end_date=end_date,
                category=category
            )
        else:
            prompt = self._build_binary_prompt(
                question=question,
                description=description,
                current_yes_price=current_yes_price,
                current_no_price=current_no_price,
                volume=volume,
                end_date=end_date,
                category=category
            )
        
        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.4,  # Slightly higher for market analysis creativity
                max_tokens=1500
            )
            
            # Parse the response
            analysis_text = response.choices[0].message.content
            analysis = json.loads(analysis_text)
            
            logger.info(f"Analysis complete: {analysis.get('predicted_outcome')} @ {analysis.get('ai_probability', 0)*100:.0f}%")
            
            # Validate and structure the response
            if is_multi_outcome:
                return self._structure_multi_outcome_response(analysis, outcomes)
            else:
                return self._structure_binary_response(analysis, current_yes_price)
            
        except Exception as e:
            logger.error(f"Error analyzing market with LLM: {e}", exc_info=True)
            return self._fallback_prediction(question, current_yes_price)
    
    def _get_system_prompt(self) -> str:
        """System prompt for market analysis."""
        return """You are an expert prediction market analyst and trader. Your job is to:

1. Analyze prediction market questions objectively
2. Estimate probabilities based on available information and reasoning
3. Compare your estimates to current market prices to identify potential edges
4. Provide clear, data-driven reasoning for your predictions

You have expertise in:
- Politics and elections
- Legal cases and court rulings
- Cryptocurrency and blockchain
- Economics and financial markets
- Technology and business

Be objective and avoid political bias. Base your analysis on facts, historical patterns, and logical reasoning.
When uncertain, acknowledge it and adjust confidence accordingly."""

    def _build_binary_prompt(
        self,
        question: str,
        description: str,
        current_yes_price: float,
        current_no_price: float,
        volume: Optional[float] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None
    ) -> str:
        """Build prompt for binary (YES/NO) market analysis."""
        
        # Format prices as cents
        yes_cents = round(current_yes_price * 100)
        no_cents = round(current_no_price * 100)
        
        # Format volume
        volume_str = "Unknown"
        if volume:
            if volume >= 1_000_000:
                volume_str = f"${volume/1_000_000:.1f}M"
            elif volume >= 1_000:
                volume_str = f"${volume/1_000:.0f}K"
            else:
                volume_str = f"${volume:.0f}"
        
        prompt = f"""Analyze this prediction market and provide your probability estimate.

MARKET QUESTION:
{question}

MARKET DETAILS:
- Category: {category or "General"}
- Current YES Price: {yes_cents}¢ (implies {yes_cents}% probability)
- Current NO Price: {no_cents}¢ (implies {no_cents}% probability)
- Trading Volume: {volume_str}
- Resolution Date: {end_date or "Not specified"}

RESOLUTION RULES:
{description[:2000] if description else "Standard resolution rules apply."}

ANALYSIS TASK:
1. Form your OWN probability estimate for YES (independent of market price)
2. Compare to the current market price - is there a trading edge?
3. Identify the key factors that will determine the outcome
4. Assess your confidence in this analysis

RESPONSE FORMAT (JSON):
{{
  "predicted_outcome": "YES" or "NO",
  "ai_probability": 0.65,
  "market_probability": {current_yes_price},
  "edge": 0.07,
  "edge_direction": "YES undervalued" or "NO undervalued" or "Fair price",
  "confidence": 0.75,
  "reasoning": "2-3 sentence explanation of your prediction",
  "key_factors": [
    "Factor 1 that supports or opposes YES",
    "Factor 2",
    "Factor 3"
  ],
  "bull_case": "Brief argument for YES",
  "bear_case": "Brief argument for NO",
  "risk_assessment": "low" or "medium" or "high",
  "time_sensitivity": "How might probability change as resolution approaches?"
}}

IMPORTANT:
- ai_probability should be YOUR estimate, not just copying market price
- edge = ai_probability - market_probability (positive means YES is undervalued)
- Be intellectually honest about uncertainty
- Consider both sides of the argument"""
        
        return prompt

    def _build_multi_outcome_prompt(
        self,
        question: str,
        description: str,
        outcomes: list,
        volume: Optional[float] = None,
        end_date: Optional[str] = None,
        category: Optional[str] = None
    ) -> str:
        """Build prompt for multi-outcome market analysis."""
        
        # Format outcomes with their current prices
        outcomes_text = ""
        for i, outcome in enumerate(outcomes[:10], 1):  # Limit to 10 outcomes
            name = outcome.get('name', f'Outcome {i}')
            price = outcome.get('price', outcome.get('yes_price', 0))
            price_cents = round(price * 100)
            outcomes_text += f"  {i}. {name}: {price_cents}¢\n"
        
        # Format volume
        volume_str = "Unknown"
        if volume:
            if volume >= 1_000_000:
                volume_str = f"${volume/1_000_000:.1f}M"
            elif volume >= 1_000:
                volume_str = f"${volume/1_000:.0f}K"
            else:
                volume_str = f"${volume:.0f}"
        
        prompt = f"""Analyze this multi-outcome prediction market.

MARKET QUESTION:
{question}

CURRENT OUTCOME PRICES:
{outcomes_text}

MARKET DETAILS:
- Category: {category or "General"}
- Number of Outcomes: {len(outcomes)}
- Trading Volume: {volume_str}
- Resolution Date: {end_date or "Not specified"}

RESOLUTION RULES:
{description[:2000] if description else "Standard resolution rules apply."}

ANALYSIS TASK:
1. Identify the most likely outcome
2. Provide probability estimates for the top outcomes
3. Identify any mispriced outcomes (potential edges)
4. Explain key factors driving the prediction

RESPONSE FORMAT (JSON):
{{
  "predicted_outcome": "Name of most likely outcome",
  "outcome_probabilities": {{
    "Outcome Name 1": 0.35,
    "Outcome Name 2": 0.25,
    "Outcome Name 3": 0.20
  }},
  "best_value": "Outcome name that appears undervalued",
  "confidence": 0.70,
  "reasoning": "2-3 sentence explanation",
  "key_factors": ["Factor 1", "Factor 2", "Factor 3"],
  "risk_assessment": "low" or "medium" or "high"
}}"""
        
        return prompt

    def _structure_binary_response(self, analysis: Dict[str, Any], market_price: float) -> Dict[str, Any]:
        """Validate and structure the LLM response for binary markets."""
        
        ai_prob = analysis.get("ai_probability", 0.5)
        
        # Ensure probability is between 0 and 1
        if ai_prob > 1:
            ai_prob = ai_prob / 100
        ai_prob = max(0.01, min(0.99, ai_prob))
        
        # Calculate edge
        edge = ai_prob - market_price
        
        # Determine edge direction
        if abs(edge) < 0.03:
            edge_direction = "Fair price"
        elif edge > 0:
            edge_direction = "YES undervalued"
        else:
            edge_direction = "NO undervalued"
        
        confidence = analysis.get("confidence", 0.5)
        if confidence > 1:
            confidence = confidence / 100
        
        return {
            "market_type": "binary",
            "predicted_outcome": analysis.get("predicted_outcome", "YES" if ai_prob > 0.5 else "NO"),
            "ai_probability": round(ai_prob, 3),
            "market_probability": round(market_price, 3),
            "edge": round(edge, 3),
            "edge_direction": edge_direction,
            "confidence": round(confidence, 2),
            "reasoning": analysis.get("reasoning", "Analysis based on available information."),
            "key_factors": analysis.get("key_factors", []),
            "bull_case": analysis.get("bull_case", ""),
            "bear_case": analysis.get("bear_case", ""),
            "risk_assessment": analysis.get("risk_assessment", "medium"),
            "time_sensitivity": analysis.get("time_sensitivity", ""),
            "analysis_method": "llm_gpt4"
        }

    def _structure_multi_outcome_response(self, analysis: Dict[str, Any], outcomes: list) -> Dict[str, Any]:
        """Validate and structure the LLM response for multi-outcome markets."""
        
        confidence = analysis.get("confidence", 0.5)
        if confidence > 1:
            confidence = confidence / 100
        
        return {
            "market_type": "multi_outcome",
            "predicted_outcome": analysis.get("predicted_outcome", "Unknown"),
            "outcome_probabilities": analysis.get("outcome_probabilities", {}),
            "best_value": analysis.get("best_value", ""),
            "confidence": round(confidence, 2),
            "reasoning": analysis.get("reasoning", "Analysis based on available information."),
            "key_factors": analysis.get("key_factors", []),
            "risk_assessment": analysis.get("risk_assessment", "medium"),
            "analysis_method": "llm_gpt4"
        }

    def _fallback_prediction(self, question: str, market_price: float) -> Dict[str, Any]:
        """Return a fallback prediction if LLM fails."""
        
        logger.warning(f"Using fallback prediction for: {question[:50]}...")
        
        return {
            "market_type": "binary",
            "predicted_outcome": "YES" if market_price > 0.5 else "NO",
            "ai_probability": market_price,  # Just echo market price
            "market_probability": market_price,
            "edge": 0,
            "edge_direction": "Fair price",
            "confidence": 0.3,
            "reasoning": "Unable to complete full analysis. Defaulting to market consensus.",
            "key_factors": ["Analysis unavailable - using market price as estimate"],
            "bull_case": "",
            "bear_case": "",
            "risk_assessment": "high",
            "time_sensitivity": "",
            "analysis_method": "fallback"
        }


# Global instance
_market_analyzer: Optional[LLMMarketAnalyzer] = None


def get_market_analyzer() -> LLMMarketAnalyzer:
    """Get or create the global market analyzer instance."""
    global _market_analyzer
    if _market_analyzer is None:
        _market_analyzer = LLMMarketAnalyzer()
    return _market_analyzer

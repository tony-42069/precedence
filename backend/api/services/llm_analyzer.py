"""
LLM-based Case Analysis Service

Uses OpenAI GPT-4 to analyze legal cases and provide predictions.
"""

import os
import logging
from typing import Dict, Any, Optional
import json
from openai import OpenAI

logger = logging.getLogger(__name__)


class LLMCaseAnalyzer:
    """Analyzes legal cases using OpenAI GPT-4."""
    
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY not found in environment variables")
        
        self.client = OpenAI(api_key=api_key)
        self.model = "gpt-4o"  # Using GPT-4o (faster and cheaper than GPT-4)
        logger.info("LLMCaseAnalyzer initialized with GPT-4o")
    
    async def analyze_case(
        self,
        case_name: str,
        case_facts: str,
        judge_name: str,
        court: str,
        case_type: str,
        docket_number: Optional[str] = None,
        procedural_history: Optional[str] = None,
        parties: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze a case and return prediction with reasoning.
        
        Args:
            case_name: Name of the case (e.g., "Trump v. Anderson")
            case_facts: Summary of case facts and legal issues
            judge_name: Name of the judge or "Per Curiam"
            court: Court name (e.g., "SUPREME COURT")
            case_type: Type of case (civil, criminal, constitutional, etc.)
            docket_number: Optional docket number
            procedural_history: Optional procedural history
            parties: Optional dict with plaintiffs/defendants
            
        Returns:
            Dict with prediction, probabilities, reasoning, and confidence
        """
        
        logger.info(f"Analyzing case: {case_name} (Judge: {judge_name})")
        
        # Build the prompt
        prompt = self._build_analysis_prompt(
            case_name=case_name,
            case_facts=case_facts,
            judge_name=judge_name,
            court=court,
            case_type=case_type,
            docket_number=docket_number,
            procedural_history=procedural_history,
            parties=parties
        )
        
        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert legal analyst who predicts case outcomes based on legal arguments, judge history, and precedent. Provide structured, data-driven analysis."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.3,  # Lower temperature for more consistent predictions
                max_tokens=1500
            )
            
            # Parse the response
            analysis_text = response.choices[0].message.content
            analysis = json.loads(analysis_text)
            
            logger.info(f"Analysis complete for {case_name}: {analysis.get('predicted_outcome')}")
            
            # Validate and structure the response
            return self._structure_response(analysis)
            
        except Exception as e:
            logger.error(f"Error analyzing case with LLM: {e}", exc_info=True)
            # Return fallback prediction
            return self._fallback_prediction(case_name)
    
    def _build_analysis_prompt(
        self,
        case_name: str,
        case_facts: str,
        judge_name: str,
        court: str,
        case_type: str,
        docket_number: Optional[str] = None,
        procedural_history: Optional[str] = None,
        parties: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build the prompt for GPT-4 analysis."""
        
        prompt = f"""Analyze this legal case and predict the outcome.

CASE INFORMATION:
- Case Name: {case_name}
- Court: {court}
- Judge: {judge_name}
- Case Type: {case_type}
- Docket: {docket_number or "N/A"}

PARTIES:
"""
        
        if parties:
            plaintiffs = parties.get('plaintiffs', [])
            defendants = parties.get('defendants', [])
            if plaintiffs:
                prompt += f"- Plaintiffs/Petitioners: {', '.join(plaintiffs[:3])}\n"
            if defendants:
                prompt += f"- Defendants/Respondents: {', '.join(defendants[:3])}\n"
        
        prompt += f"""
CASE FACTS & LEGAL ISSUES:
{case_facts[:2000]}  # Limit to 2000 chars
"""
        
        if procedural_history:
            prompt += f"""
PROCEDURAL HISTORY:
{procedural_history[:1000]}
"""
        
        prompt += """

ANALYSIS REQUIRED:
1. Predict the most likely outcome (PLAINTIFF_WIN, DEFENDANT_WIN, or SETTLEMENT)
2. Provide probability percentages for each outcome (must sum to 100)
3. Analyze the judge's likely perspective based on their known judicial philosophy
4. Identify key legal factors that will influence the decision
5. Assess overall confidence in your prediction

RESPONSE FORMAT (JSON):
{
  "predicted_outcome": "PLAINTIFF_WIN" | "DEFENDANT_WIN" | "SETTLEMENT",
  "probabilities": {
    "PLAINTIFF_WIN": 45.0,
    "DEFENDANT_WIN": 35.0,
    "SETTLEMENT": 20.0
  },
  "confidence": 0.72,
  "reasoning": "Brief explanation of why this outcome is predicted (2-3 sentences)",
  "key_factors": [
    "Factor 1 that influences the outcome",
    "Factor 2 that influences the outcome",
    "Factor 3 that influences the outcome"
  ],
  "judge_analysis": {
    "ideology": "conservative" | "liberal" | "moderate" | "unknown",
    "likely_perspective": "How this judge typically approaches these types of cases",
    "historical_pattern": "Pattern in similar past cases if known"
  },
  "risk_assessment": "low" | "medium" | "high"
}

IMPORTANT: 
- Probabilities MUST sum to exactly 100
- Base analysis on legal merits, not political preferences
- Consider procedural posture and jurisdiction
- Be realistic about uncertainty
"""
        
        return prompt
    
    def _structure_response(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and structure the LLM response."""
        
        # Ensure required fields exist
        predicted_outcome = analysis.get("predicted_outcome", "DEFENDANT_WIN")
        probabilities = analysis.get("probabilities", {
            "PLAINTIFF_WIN": 40.0,
            "DEFENDANT_WIN": 40.0,
            "SETTLEMENT": 20.0
        })
        
        # Normalize probabilities to sum to 1.0 (from percentages)
        total = sum(probabilities.values())
        if total > 0:
            probabilities = {k: v/total for k, v in probabilities.items()}
        
        confidence = analysis.get("confidence", 0.65)
        
        # Ensure confidence is between 0 and 1
        if confidence > 1.0:
            confidence = confidence / 100.0
        
        return {
            "predicted_outcome": predicted_outcome,
            "confidence": confidence,
            "probabilities": probabilities,
            "reasoning": analysis.get("reasoning", "Analysis based on case facts and judge history."),
            "key_factors": analysis.get("key_factors", []),
            "judge_analysis": analysis.get("judge_analysis", {
                "ideology": "unknown",
                "likely_perspective": "Insufficient data",
                "historical_pattern": "Unknown"
            }),
            "risk_assessment": analysis.get("risk_assessment", "medium"),
            "analysis_method": "llm_gpt4"
        }
    
    def _fallback_prediction(self, case_name: str) -> Dict[str, Any]:
        """Return a fallback prediction if LLM fails."""
        
        logger.warning(f"Using fallback prediction for {case_name}")
        
        return {
            "predicted_outcome": "DEFENDANT_WIN",
            "confidence": 0.5,
            "probabilities": {
                "PLAINTIFF_WIN": 0.40,
                "DEFENDANT_WIN": 0.40,
                "SETTLEMENT": 0.20
            },
            "reasoning": "Unable to complete full analysis. This is a baseline prediction.",
            "key_factors": ["Analysis unavailable"],
            "judge_analysis": {
                "ideology": "unknown",
                "likely_perspective": "Analysis unavailable",
                "historical_pattern": "Unknown"
            },
            "risk_assessment": "high",
            "analysis_method": "fallback"
        }


# Global instance
_llm_analyzer: Optional[LLMCaseAnalyzer] = None


def get_llm_analyzer() -> LLMCaseAnalyzer:
    """Get or create the global LLM analyzer instance."""
    global _llm_analyzer
    if _llm_analyzer is None:
        _llm_analyzer = LLMCaseAnalyzer()
    return _llm_analyzer

"""
Market Prediction Module for Precedence Prediction Markets.

This module adapts the litigation simulator's case prediction functionality
for prediction market use cases, focusing on generating outcome probabilities
for betting rather than attorney strategy assistance.

Adapted from litigation-simulator/case_prediction.py
"""

import os
import json
import logging
import numpy as np
from typing import Dict, List, Any, Optional, Union, Tuple
import re
import pickle
from datetime import datetime

# Import required ML libraries
import sklearn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pandas as pd

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MarketPredictor:
    """
    Class for predicting case outcomes for prediction markets.

    This class uses machine learning to predict probabilities for different
    case outcomes, optimized for prediction market trading rather than
    attorney strategy assistance.
    """

    def __init__(self, model_dir: str = None):
        """
        Initialize the MarketPredictor.

        Args:
            model_dir: Directory to store/load trained models
        """
        self.model_dir = model_dir or os.getenv("MODEL_DIR", "./models")

        # Models for different prediction types
        self.outcome_model = None  # Multi-class outcome prediction
        self.probability_model = None  # Probability estimation model

        # Feature importance tracking
        self.feature_names = []
        self.outcome_classes = []

        # Create model directory if it doesn't exist
        os.makedirs(self.model_dir, exist_ok=True)

        # Try to load pre-trained models
        self.load_models()

    def load_models(self) -> bool:
        """
        Load pre-trained models if available.

        Returns:
            bool: True if models were loaded, False otherwise
        """
        try:
            logger.info("Attempting to load pre-trained market prediction models...")

            # Path to model files
            outcome_model_path = os.path.join(self.model_dir, 'market_outcome_model.pkl')
            prob_model_path = os.path.join(self.model_dir, 'market_probability_model.pkl')
            meta_path = os.path.join(self.model_dir, 'market_meta.json')

            # Check if files exist
            if not os.path.exists(outcome_model_path):
                logger.info("Outcome model file missing. Will train new model when needed.")
                return False

            # Load models
            self.outcome_model = pickle.load(open(outcome_model_path, 'rb'))
            if os.path.exists(prob_model_path):
                self.probability_model = pickle.load(open(prob_model_path, 'rb'))

            # Load metadata
            if os.path.exists(meta_path):
                with open(meta_path, 'r') as f:
                    meta = json.load(f)
                    self.feature_names = meta.get('feature_names', [])
                    self.outcome_classes = meta.get('outcome_classes', [])

            logger.info("Market prediction models loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Error loading pre-trained models: {str(e)}")
            return False

    def save_models(self) -> bool:
        """
        Save trained models to disk.

        Returns:
            bool: True if models were saved, False otherwise
        """
        try:
            logger.info("Saving trained market prediction models...")

            # Check if models exist
            if not self.outcome_model:
                logger.warning("Models not available for saving")
                return False

            # Save models
            pickle.dump(self.outcome_model, open(os.path.join(self.model_dir, 'market_outcome_model.pkl'), 'wb'))
            if self.probability_model:
                pickle.dump(self.probability_model, open(os.path.join(self.model_dir, 'market_probability_model.pkl'), 'wb'))

            # Save metadata
            meta = {
                'feature_names': self.feature_names,
                'outcome_classes': self.outcome_classes,
                'saved_at': datetime.now().isoformat()
            }
            with open(os.path.join(self.model_dir, 'market_meta.json'), 'w') as f:
                json.dump(meta, f, indent=2)

            logger.info("Market prediction models saved successfully")
            return True

        except Exception as e:
            logger.error(f"Error saving models: {str(e)}")
            return False

    def train_outcome_model(self, training_data: List[Dict[str, Any]]) -> bool:
        """
        Train a model to predict case outcomes for markets.

        Args:
            training_data: List of training examples
                Each example should include:
                - case_type (str): Type of case (civil, criminal, etc.)
                - case_facts (str): Text description of case facts
                - jurisdiction (dict): Jurisdiction info
                - judge_id (str, optional): Judge identifier
                - case_age_months (int, optional): How old the case is
                - precedent_strength (float, optional): Strength of precedent
                - outcome (str): Actual outcome (PLAINTIFF_WIN, DEFENDANT_WIN, SETTLEMENT, etc.)

        Returns:
            bool: True if training was successful, False otherwise
        """
        logger.info(f"Training market outcome model with {len(training_data)} examples")

        if not training_data:
            logger.error("No training data provided")
            return False

        try:
            # Convert to pandas DataFrame
            df = pd.DataFrame(training_data)

            # Extract features and target
            feature_cols = [col for col in df.columns if col != 'outcome']
            X = df[feature_cols]
            y = df['outcome']

            # Store outcome classes
            self.outcome_classes = sorted(y.unique().tolist())

            # Prepare feature preprocessing
            preprocessor = self._build_market_feature_preprocessor(feature_cols)

            # Create pipeline with classifier
            self.outcome_model = Pipeline([
                ('preprocessor', preprocessor),
                ('classifier', RandomForestClassifier(n_estimators=200, random_state=42, max_depth=20))
            ])

            # Train model
            self.outcome_model.fit(X, y)

            # Extract feature names
            self.feature_names = self._extract_feature_names(preprocessor, feature_cols)

            # Train probability calibration model if needed
            self._train_probability_model(X, y)

            # Save trained model
            self.save_models()

            # Log training results
            train_predictions = self.outcome_model.predict(X)
            accuracy = accuracy_score(y, train_predictions)
            logger.info(f"Training accuracy: {accuracy:.3f}")

            return True

        except Exception as e:
            logger.error(f"Error training market outcome model: {str(e)}")
            return False

    def predict_outcome_probabilities(self, case_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Predict outcome probabilities for a case (optimized for prediction markets).

        Args:
            case_data: Dictionary containing case information
                - case_type: Type of case
                - case_facts: Text description
                - jurisdiction: Jurisdiction info
                - judge_id: Judge identifier (optional)
                - case_age_months: Case age in months (optional)
                - precedent_strength: Precedent strength 0-1 (optional)

        Returns:
            Dict with prediction results:
                - probabilities: Dict of outcome -> probability
                - predicted_outcome: Most likely outcome
                - confidence: Confidence in prediction (0-1)
                - market_recommendations: Suggested odds/insights for market creation
                - feature_impact: Top factors influencing prediction
        """
        try:
            # Prepare input data
            input_df = pd.DataFrame([case_data])

            # Get predictions
            if self.probability_model:
                probabilities = self.probability_model.predict_proba(input_df)[0]
            else:
                probabilities = self.outcome_model.predict_proba(input_df)[0]

            # Create probability dictionary
            outcome_probs = {}
            for i, outcome_class in enumerate(self.outcome_classes):
                outcome_probs[outcome_class] = float(probabilities[i])

            # Find predicted outcome
            predicted_idx = np.argmax(probabilities)
            predicted_outcome = self.outcome_classes[predicted_idx]
            confidence = float(probabilities[predicted_idx])

            # Generate market recommendations
            market_recommendations = self._generate_market_recommendations(outcome_probs)

            # Analyze feature impact
            feature_impact = self._analyze_case_factors(case_data, predicted_outcome)

            return {
                "probabilities": outcome_probs,
                "predicted_outcome": predicted_outcome,
                "confidence": confidence,
                "market_recommendations": market_recommendations,
                "feature_impact": feature_impact,
                "model_version": "market_predictor_v1.0"
            }

        except Exception as e:
            logger.error(f"Error in market prediction: {str(e)}")
            raise ValueError(f"Prediction error: {str(e)}")

    def _build_market_feature_preprocessor(self, feature_cols: List[str]) -> ColumnTransformer:
        """
        Build feature preprocessor for market prediction.

        Args:
            feature_cols: List of feature column names

        Returns:
            ColumnTransformer: Preprocessor for features
        """
        transformers = []

        # Text features
        text_features = [col for col in feature_cols if 'facts' in col.lower() or 'description' in col.lower()]
        if text_features:
            transformers.append((
                'text', Pipeline([
                    ('tfidf', TfidfVectorizer(max_features=3000, stop_words='english', ngram_range=(1, 2)))
                ]), text_features
            ))

        # Categorical features
        categorical_features = [col for col in feature_cols if col in ['case_type', 'judge_id', 'jurisdiction_level']]
        if categorical_features:
            transformers.append((
                'cat', Pipeline([
                    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse=False))
                ]), categorical_features
            ))

        # Numerical features
        numerical_features = [col for col in feature_cols if col in ['case_age_months', 'precedent_strength']]
        if numerical_features:
            transformers.append((
                'num', Pipeline([
                    ('scaler', StandardScaler())
                ]), numerical_features
            ))

        return ColumnTransformer(transformers=transformers, remainder='drop')

    def _extract_feature_names(self, preprocessor: ColumnTransformer, feature_cols: List[str]) -> List[str]:
        """Extract feature names from preprocessor."""
        try:
            feature_names = []

            # Get feature names from each transformer
            for transformer_name, transformer, features in preprocessor.transformers_:
                if transformer_name == 'text':
                    vectorizer = transformer.named_steps['tfidf']
                    tfidf_features = [f'tfidf_{i}' for i in range(len(vectorizer.get_feature_names()))]
                    feature_names.extend(tfidf_features)
                elif transformer_name == 'cat':
                    encoder = transformer.named_steps['onehot']
                    cat_features = encoder.get_feature_names_out(features).tolist() if hasattr(encoder, 'get_feature_names_out') else features
                    feature_names.extend(cat_features)
                elif transformer_name == 'num':
                    feature_names.extend(features)

            return feature_names
        except Exception as e:
            logger.error(f"Error extracting feature names: {str(e)}")
            return []

    def _train_probability_model(self, X: pd.DataFrame, y: pd.Series):
        """Train a separate model for probability calibration."""
        try:
            # Use the same preprocessing
            preprocessor = self._build_market_feature_preprocessor(X.columns.tolist())

            # Create isotonic regression or sigmoid calibration
            from sklearn.calibration import CalibratedClassifierCV

            base_estimator = RandomForestClassifier(n_estimators=100, random_state=42)

            self.probability_model = Pipeline([
                ('preprocessor', preprocessor),
                ('calibrated_classifier', CalibratedClassifierCV(base_estimator, method='isotonic', cv=3))
            ])

            self.probability_model.fit(X, y)
            logger.info("Probability calibration model trained")

        except Exception as e:
            logger.warning(f"Could not train probability model: {str(e)}")

    def _generate_market_recommendations(self, outcome_probs: Dict[str, float]) -> Dict[str, Any]:
        """
        Generate recommendations for market creation based on prediction.

        Args:
            outcome_probs: Dictionary of outcome probabilities

        Returns:
            Dict with market recommendations
        """
        # Calculate implied odds and market efficiency
        total_prob = sum(outcome_probs.values())
        normalized_probs = {k: v/total_prob for k, v in outcome_probs.items()}

        recommendations = {
            "suggested_outcomes": list(outcome_probs.keys()),
            "initial_odds": {outcome: 1/prob if prob > 0 else 10.0
                           for outcome, prob in normalized_probs.items()},
            "recommended_liquidity": self._calculate_recommended_liquidity(outcome_probs),
            "market_efficiency_score": self._calculate_market_efficiency(normalized_probs),
            "trading_volume_potential": self._estimate_volume_potential(outcome_probs)
        }

        return recommendations

    def _calculate_recommended_liquidity(self, outcome_probs: Dict[str, float]) -> float:
        """Calculate recommended initial liquidity based on outcome probabilities."""
        # More balanced outcomes need more liquidity
        entropy = -sum(p * np.log(p) if p > 0 else 0 for p in outcome_probs.values())
        base_liquidity = 10.0  # Base 10 SOL
        return base_liquidity * (1 + entropy)

    def _calculate_market_efficiency(self, normalized_probs: Dict[str, float]) -> float:
        """Calculate market efficiency score (closer to 1.0 is more efficient)."""
        # Perfectly balanced market has efficiency near 1.0
        num_outcomes = len(normalized_probs)
        perfect_prob = 1.0 / num_outcomes

        efficiency = 1.0 - (sum(abs(prob - perfect_prob) for prob in normalized_probs.values()) / num_outcomes)
        return max(0.0, min(1.0, efficiency))

    def _estimate_volume_potential(self, outcome_probs: Dict[str, float]) -> str:
        """Estimate trading volume potential."""
        # Based on outcome distribution
        max_prob = max(outcome_probs.values())
        num_outcomes = len(outcome_probs)

        if max_prob > 0.8:
            return "low"  # Very predictable, low trading interest
        elif num_outcomes > 3 and max_prob < 0.4:
            return "high"  # Many outcomes, hard to predict
        else:
            return "medium"

    def _analyze_case_factors(self, case_data: Dict[str, Any], predicted_outcome: str) -> Dict[str, Any]:
        """Analyze key factors influencing the prediction."""
        factors = []

        # Judge factor (significant impact on legal outcomes)
        if case_data.get('judge_id'):
            factors.append({
                "factor": "judge_history",
                "impact": "high",
                "description": f"Judge {case_data['judge_id']} has relevant historical rulings"
            })

        # Case type factor
        case_type = case_data.get('case_type', 'unknown')
        factors.append({
            "factor": "case_type",
            "impact": "medium",
            "description": f"Historical patterns for {case_type} cases"
        })

        # Jurisdiction factor
        if case_data.get('jurisdiction'):
            jurisdiction = case_data['jurisdiction']
            factors.append({
                "factor": "jurisdiction",
                "impact": "medium",
                "description": f"Jurisdictional considerations from {jurisdiction}"
            })

        # Precedent strength
        precedent = case_data.get('precedent_strength', 0.5)
        impact = "high" if precedent > 0.8 else "low" if precedent < 0.3 else "medium"
        factors.append({
            "factor": "precedent_strength",
            "impact": impact,
            "description": f"Precedent strength affects outcome probability"
        })

        return {
            "key_factors": factors[:5],  # Top 5 factors
            "model_confidence": len(factors),  # Simple confidence proxy
            "prediction_basis": f"Based on analysis of {len(factors)} case factors"
        }

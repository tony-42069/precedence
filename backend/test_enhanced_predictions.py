#!/usr/bin/env python3
"""
Test Enhanced Predictions with Judge Analysis

Tests the trained judge analysis models with enhanced predictions.
"""

import sys
import os

# Add backend directory to path
backend_dir = os.path.dirname(__file__)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from ml.enhanced_predictor import predict_case_with_judge_analysis

def test_enhanced_predictions():
    """Test enhanced predictions with judge analysis."""
    print("Testing Enhanced Predictions with Judge Analysis")
    print("=" * 60)

    # Test cases with different judge types
    test_cases = [
        {
            'case_name': 'Test Immigration Case',
            'case_type': 'general',
            'citation_count': 25,
            'judge_id': 'junior_judge_general'
        },
        {
            'case_name': 'Test Administrative Case',
            'case_type': 'administrative',
            'citation_count': 50,
            'judge_id': 'experienced_judge_general'
        },
        {
            'case_name': 'Test Constitutional Case',
            'case_type': 'constitutional',
            'citation_count': 100,
            'judge_id': 'senior_judge_general'
        }
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['case_name']}")
        print(f"   Judge: {test_case['judge_id']}")
        print(f"   Type: {test_case['case_type']}")
        print(f"   Citations: {test_case['citation_count']}")

        try:
            result = predict_case_with_judge_analysis(
                case_data=test_case,
                judge_id=test_case['judge_id']
            )

            print("   Prediction successful!")
            print(f"   Outcome: {result.get('predicted_outcome', 'N/A')}")
            print(f"   Confidence: {result.get('confidence', 0):.3f}")
            print(f"   Judge analysis: {'Available' if 'judge_analysis' in result else 'Missing'}")

            if 'judge_analysis' in result:
                ja = result['judge_analysis']
                print(f"   Judge bias: {ja.get('judge_bias', 'unknown')}")

        except Exception as e:
            print(f"   Test failed: {e}")
            import traceback
            traceback.print_exc()

    print("\n" + "=" * 60)
    print("Enhanced prediction testing complete!")

if __name__ == "__main__":
    test_enhanced_predictions()

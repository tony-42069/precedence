#!/usr/bin/env python3
"""
Mock SCOTUS Data Generator for Precedence

Generates realistic Supreme Court case data for testing judge analysis models.
Creates training data with judges, outcomes, and case types.
"""

import json
import random
from datetime import datetime, timedelta
from typing import Dict, List, Any
import os

# Supreme Court Justices (past and present)
SCOTUS_JUSTICES = [
    {"id": "john-roberts", "name": "John Roberts", "appointed": 2005},
    {"id": "clarence-thomas", "name": "Clarence Thomas", "appointed": 1991},
    {"id": "samuel-alito", "name": "Samuel Alito", "appointed": 2006},
    {"id": "sonia-sotomayor", "name": "Sonia Sotomayor", "appointed": 2009},
    {"id": "elena-kagan", "name": "Elena Kagan", "appointed": 2010},
    {"id": "neil-gorsuch", "name": "Neil Gorsuch", "appointed": 2017},
    {"id": "brett-kavanaugh", "name": "Brett Kavanaugh", "appointed": 2018},
    {"id": "amy-coney-barrett", "name": "Amy Coney Barrett", "appointed": 2020},
    {"id": "antonin-scalia", "name": "Antonin Scalia", "appointed": 1986},  # Deceased
    {"id": "ruth-bader-ginsburg", "name": "Ruth Bader Ginsburg", "appointed": 1993},  # Deceased
    {"id": "stephen-breyer", "name": "Stephen Breyer", "appointed": 1994},  # Retired
]

# Case types and their characteristics
CASE_TYPES = {
    'constitutional': {
        'keywords': ['constitution', 'first amendment', 'due process', 'equal protection', 'voting rights'],
        'conservative_win_rate': 0.65,
        'liberal_win_rate': 0.35
    },
    'criminal': {
        'keywords': ['criminal', 'sentencing', 'death penalty', 'search and seizure'],
        'conservative_win_rate': 0.70,
        'liberal_win_rate': 0.30
    },
    'civil_rights': {
        'keywords': ['discrimination', 'affirmative action', 'civil rights', 'equal employment'],
        'conservative_win_rate': 0.60,
        'liberal_win_rate': 0.40
    },
    'administrative': {
        'keywords': ['agency', 'regulation', 'epa', 'fcc', 'sec', 'administrative'],
        'conservative_win_rate': 0.55,
        'liberal_win_rate': 0.45
    },
    'commercial': {
        'keywords': ['contract', 'business', 'antitrust', 'intellectual property'],
        'conservative_win_rate': 0.50,
        'liberal_win_rate': 0.50
    },
    'tax': {
        'keywords': ['tax', 'irs', 'income tax', 'estate tax'],
        'conservative_win_rate': 0.45,
        'liberal_win_rate': 0.55
    }
}

# Sample case names by type
CASE_NAMES = {
    'constitutional': [
        "Smith v. United States (First Amendment)",
        "Johnson v. Texas (Free Speech)",
        "Williams v. California (Equal Protection)",
        "Brown v. Board of Education (School Desegregation)",
        "Roe v. Wade (Abortion Rights)",
        "Citizens United v. FEC (Campaign Finance)",
        "Obergefell v. Hodges (Same-Sex Marriage)",
        "Shelby County v. Holder (Voting Rights)"
    ],
    'criminal': [
        "Miller v. Alabama (Juvenile Sentencing)",
        "Graham v. Florida (Life Without Parole)",
        "Carpenter v. United States (Digital Privacy)",
        "Riley v. California (Cell Phone Searches)",
        "Herrera v. Wyoming (Native American Rights)",
        "McCoy v. Louisiana (Right to Counsel)"
    ],
    'civil_rights': [
        "Parents Involved v. Seattle (School Assignment)",
        "Fisher v. University of Texas (Affirmative Action)",
        "Olmstead v. L.C. (Disability Rights)",
        "Obergefell v. Hodges (Marriage Equality)",
        "Masterpiece Cakeshop v. Colorado (Religious Freedom)"
    ],
    'administrative': [
        "Chevron U.S.A. v. Natural Resources Defense Council",
        "King v. Burwell (ACA Implementation)",
        "Michigan v. EPA (Clean Power Plan)",
        "Kisor v. Wilkie (Veterans Affairs)",
        "Bostock v. Clayton County (Employment Discrimination)"
    ],
    'commercial': [
        "Oil States Energy v. Greene's Energy Group",
        "SAS Institute v. Iancu (Patent Eligibility)",
        "Thole v. U.S. Bank (Bankruptcy)",
        "Frank v. Gaos (Class Action Settlements)"
    ],
    'tax': [
        "South Dakota v. Wayfair (Sales Tax)",
        "Maine v. United States (Estate Tax)",
        "Moore v. United States (Corporate Tax)",
        "Charles v. United States (Tax Penalties)"
    ]
}

def generate_mock_scotus_data(num_cases: int = 500) -> List[Dict[str, Any]]:
    """
    Generate mock SCOTUS case data for training.

    Args:
        num_cases: Number of cases to generate

    Returns:
        List of mock case data
    """
    cases = []

    # Generate cases from 2010-2024
    start_date = datetime(2010, 1, 1)
    end_date = datetime(2024, 12, 31)

    for i in range(num_cases):
        # Random date within range
        days_range = (end_date - start_date).days
        random_days = random.randint(0, days_range)
        case_date = start_date + timedelta(days=random_days)

        # Select case type
        case_type = random.choice(list(CASE_TYPES.keys()))

        # Select case name
        case_names = CASE_NAMES.get(case_type, CASE_NAMES['constitutional'])
        case_name = random.choice(case_names)

        # Generate case ID
        case_id = f"scotus_{case_date.year}_{i+1:04d}"

        # Select random panel of 9 justices (typical SCOTUS case)
        available_justices = [j for j in SCOTUS_JUSTICES if j['appointed'] <= case_date.year]
        if len(available_justices) < 9:
            available_justices = SCOTUS_JUSTICES  # Fallback

        panel = random.sample(available_justices, min(9, len(available_justices)))

        # Convert to judge format
        judges = []
        for justice in panel:
            judges.append({
                'judge_id': justice['id'],
                'judge_name': justice['name'],
                'role': 'justice'
            })

        # Determine outcome based on case type and conservative/liberal leanings
        case_info = CASE_TYPES[case_type]
        conservative_win_rate = case_info['conservative_win_rate']

        # Simulate outcome based on case type bias
        if random.random() < conservative_win_rate:
            outcome = random.choice(['AFFIRMED', 'REVERSED', 'DENIED'])
        else:
            outcome = random.choice(['AFFIRMED', 'REVERSED', 'GRANTED', 'REMANDED'])

        # Generate citation count (more cited = more important cases)
        citation_count = random.randint(0, 500)
        if random.random() < 0.1:  # 10% of cases are highly cited
            citation_count = random.randint(500, 2000)

        # Create case data
        case_data = {
            'case_id': case_id,
            'case_name': case_name,
            'date_filed': case_date.strftime('%Y-%m-%d'),
            'court': 'scotus',
            'judges': judges,
            'outcome': outcome,
            'case_facts': f"{case_name} - {case_type.replace('_', ' ').title()} case",
            'citation_count': citation_count,
            'case_type': case_type,
            'processed_at': datetime.now().isoformat(),
            'source': 'mock_data_generator'
        }

        cases.append(case_data)

    return cases

def save_mock_data(cases: List[Dict[str, Any]], output_file: str):
    """
    Save mock case data to JSON file.

    Args:
        cases: List of case data
        output_file: Output file path
    """
    data = {
        'metadata': {
            'total_cases': len(cases),
            'generated_at': datetime.now().isoformat(),
            'data_source': 'mock_generator',
            'court': 'scotus',
            'description': 'Mock SCOTUS data for judge analysis training'
        },
        'cases': cases
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(cases)} mock SCOTUS cases to {output_file}")

def analyze_generated_data(cases: List[Dict[str, Any]]):
    """
    Analyze the generated mock data for quality assurance.

    Args:
        cases: Generated case data
    """
    print(f"\n=== Mock SCOTUS Data Analysis ===")
    print(f"Total cases: {len(cases)}")

    # Case type distribution
    case_types = {}
    for case in cases:
        case_type = case['case_type']
        case_types[case_type] = case_types.get(case_type, 0) + 1

    print(f"\nCase type distribution:")
    for case_type, count in case_types.items():
        percentage = (count / len(cases)) * 100
        print(f"  {case_type}: {count} ({percentage:.1f}%)")

    # Outcome distribution
    outcomes = {}
    for case in cases:
        outcome = case['outcome']
        outcomes[outcome] = outcomes.get(outcome, 0) + 1

    print(f"\nOutcome distribution:")
    for outcome, count in outcomes.items():
        percentage = (count / len(cases)) * 100
        print(f"  {outcome}: {count} ({percentage:.1f}%)")

    # Judge participation
    judge_counts = {}
    for case in cases:
        for judge in case['judges']:
            judge_id = judge['judge_id']
            judge_counts[judge_id] = judge_counts.get(judge_id, 0) + 1

    print(f"\nTop 5 most active justices:")
    sorted_judges = sorted(judge_counts.items(), key=lambda x: x[1], reverse=True)
    for judge_id, count in sorted_judges[:5]:
        justice = next((j for j in SCOTUS_JUSTICES if j['id'] == judge_id), None)
        name = justice['name'] if justice else judge_id
        print(f"  {name}: {count} cases")

    # Citation statistics
    citations = [case['citation_count'] for case in cases]
    avg_citations = sum(citations) / len(citations)
    max_citations = max(citations)

    print(f"\nCitation statistics:")
    print(f"  Average citations: {avg_citations:.1f}")
    print(f"  Max citations: {max_citations}")
    print(f"  Cases with >500 citations: {len([c for c in citations if c > 500])}")

def main():
    """Generate mock SCOTUS data."""
    print("Generating mock SCOTUS data for judge analysis training...")

    # Generate data
    cases = generate_mock_scotus_data(num_cases=500)

    # Create output directory
    output_dir = os.path.join(os.path.dirname(__file__), '../data/scotus')
    os.makedirs(output_dir, exist_ok=True)

    # Save data
    output_file = os.path.join(output_dir, 'mock_scotus_cases.json')
    save_mock_data(cases, output_file)

    # Analyze data
    analyze_generated_data(cases)

    print(f"\n✅ Mock SCOTUS data generation complete!")
    print(f"📁 Data saved to: {output_file}")
    print(f"🎯 Ready for judge analysis model training!")

if __name__ == "__main__":
    main()

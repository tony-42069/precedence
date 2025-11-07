#!/usr/bin/env python3
"""
SCOTUS Data Fetcher for Precedence

Fetches Supreme Court cases from CourtListener API for judge analysis training.
Extracts case data, judge information, and outcomes for ML model training.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import requests
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from backend/.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '../.env'))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scotus_data_fetch.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SCOTUSDataFetcher:
    """
    Fetches and processes Supreme Court data from CourtListener API.
    """

    def __init__(self, api_key: str = None, output_dir: str = None):
        """
        Initialize the SCOTUS data fetcher.

        Args:
            api_key: CourtListener API key
            output_dir: Directory to save fetched data
        """
        self.api_key = api_key or os.getenv('COURT_LISTENER_API_KEY')
        self.output_dir = output_dir or os.path.join(os.path.dirname(__file__), '../data/scotus')
        self.base_url = 'https://www.courtlistener.com/api/rest/v4'
        self.opinions_url = f"{self.base_url}/opinions/"

        # Create output directory
        os.makedirs(self.output_dir, exist_ok=True)

        # Headers for API requests
        self.headers = {
            'Authorization': f'Token {self.api_key}',
            'Content-Type': 'application/json'
        }

        logger.info(f"SCOTUSDataFetcher initialized with output dir: {self.output_dir}")

    def fetch_scotus_cases(
        self,
        start_year: int = 2010,
        end_year: int = 2024,
        max_cases: int = 1000,
        save_progress: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Fetch Supreme Court cases from CourtListener API using search endpoint.

        Args:
            start_year: Start year for case filtering
            end_year: End year for case filtering
            max_cases: Maximum number of cases to fetch
            save_progress: Whether to save progress to file

        Returns:
            List of processed case data
        """
        logger.info(f"Fetching SCOTUS cases from {start_year} to {end_year}, max {max_cases} cases")

        # Import the working CourtListener client
        import sys
        import os
        # Add backend directory to path for absolute imports
        backend_dir = os.path.dirname(os.path.dirname(__file__))
        if backend_dir not in sys.path:
            sys.path.insert(0, backend_dir)

        from integrations.court_listener import court_listener

        all_cases = []
        cases_fetched = 0
        cursor = None  # For pagination

        while cases_fetched < max_cases:
            try:
                # Use the search endpoint with proper parameters
                results = court_listener.search_cases(
                    court="scotus",
                    filed_after=f"{start_year}-01-01" if start_year else None,
                    filed_before=f"{end_year}-12-31" if end_year else None,
                    limit=min(20, max_cases - cases_fetched)  # API limit per request
                )

                cases = results.get('results', [])

                if not cases:
                    logger.info("No more cases found")
                    break

                logger.info(f"Fetched {len(cases)} cases (total: {cases_fetched + len(cases)})")

                # Process each case
                for case in cases:
                    if cases_fetched >= max_cases:
                        break

                    # Debug: print first case structure
                    if cases_fetched == 0:
                        print(f"DEBUG: Sample search result keys: {list(case.keys())}")
                        print(f"DEBUG: Sample caseName: {case.get('caseName')}")
                        print(f"DEBUG: Sample id: {case.get('id')}")
                        print(f"DEBUG: Sample dateFiled: {case.get('dateFiled')}")
                        print(f"DEBUG: Sample court: {case.get('court')}")

                    processed_case = self._process_search_result(case)
                    if processed_case:
                        all_cases.append(processed_case)
                        cases_fetched += 1
                    else:
                        logger.debug(f"Case processing failed for case {case.get('id')}")

                # CourtListener search doesn't use cursor-based pagination like we expected
                # It returns all results at once, so we break after one request
                # If we need more cases, we'd need to adjust date ranges or other filters
                logger.info("Completed search request - CourtListener returns all matching results")
                break

                # Rate limiting - be respectful to the API
                time.sleep(1)

                # Save progress periodically
                if save_progress and cases_fetched % 100 == 0:
                    self._save_progress(all_cases, cases_fetched)

            except Exception as e:
                logger.error(f"Error fetching cases: {str(e)}")
                break

        # Final save
        if save_progress:
            self._save_progress(all_cases, cases_fetched, final=True)

        logger.info(f"Successfully fetched {len(all_cases)} SCOTUS cases")
        return all_cases

    def _process_search_result(self, case: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process a single case from the search API response.

        Args:
            case: Raw case data from search API

        Returns:
            Processed case data or None if invalid
        """
        try:
            # Extract basic case information (search API field names)
            case_id = case.get('cluster_id')  # Search API uses cluster_id, not id
            case_name = case.get('caseName', '')  # Note: caseName, not case_name
            date_filed = case.get('dateFiled')   # Note: dateFiled, not date_filed
            court = case.get('court', '')

            # Skip if missing essential data
            if not case_id or not case_name:
                logger.debug(f"Skipping case missing id or name: id={case_id}, name={case_name}")
                return None

            # Extract judge information (search results may not have detailed judge info)
            judges = self._extract_judges_from_search(case)

            # Extract case outcome (search results may not have outcomes)
            outcome = self._extract_outcome_from_search(case)

            # Extract case facts/description
            case_facts = self._extract_case_facts_from_search(case)

            # Extract citation count (may not be available in search)
            citation_count = case.get('citeCount', 0)  # Different field name

            # Determine case type
            case_type = self._classify_case_type(case_name, case_facts)

            processed_case = {
                'case_id': str(case_id),
                'case_name': case_name,
                'date_filed': date_filed,
                'court': court,
                'judges': judges,
                'outcome': outcome,
                'case_facts': case_facts,
                'citation_count': citation_count,
                'case_type': case_type,
                'processed_at': datetime.now().isoformat(),
                'source': 'courtlistener_search_api'
            }

            return processed_case

        except Exception as e:
            logger.error(f"Error processing search result {case.get('id')}: {str(e)}")
            return None

    def _extract_judges_from_search(self, case: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract judge information from search result data.

        Args:
            case: Case data from search API

        Returns:
            List of judge information (may be limited in search results)
        """
        judges = []

        # Search results may not have detailed judge information
        # We can try to extract from case name or other fields if available
        # For now, return empty list - judge details would need cluster API call
        return judges

    def _extract_outcome_from_search(self, case: Dict[str, Any]) -> Optional[str]:
        """
        Extract case outcome from search result data.

        Args:
            case: Case data from search API

        Returns:
            Case outcome or None (search results typically don't include outcomes)
        """
        # Search results don't typically include case outcomes
        # This would require fetching cluster details
        return None

    def _extract_case_facts_from_search(self, case: Dict[str, Any]) -> str:
        """
        Extract case facts/description from search result.

        Args:
            case: Case data from search API

        Returns:
            Case description/facts
        """
        # Use case name as primary description
        description = case.get('caseName', '')

        # Add docket number if available
        docket = case.get('docketNumber', '')
        if docket:
            description += f" (Docket: {docket})"

        return description

    def _process_case(self, case: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Process a single case from the API response.

        Args:
            case: Raw case data from API

        Returns:
            Processed case data or None if invalid
        """
        try:
            # Extract basic case information
            case_id = case.get('id')
            case_name = case.get('case_name', '')
            date_filed = case.get('date_filed')
            court = case.get('court', '')

            # Skip if missing essential data
            if not case_id or not case_name:
                return None

            # Extract judge information
            judges = self._extract_judges(case)

            # Extract case outcome (if available)
            outcome = self._extract_outcome(case)

            # Extract case facts/description
            case_facts = self._extract_case_facts(case)

            # Extract citation count
            citation_count = case.get('citation_count', 0)

            # Determine case type
            case_type = self._classify_case_type(case_name, case_facts)

            processed_case = {
                'case_id': str(case_id),
                'case_name': case_name,
                'date_filed': date_filed,
                'court': court,
                'judges': judges,
                'outcome': outcome,
                'case_facts': case_facts,
                'citation_count': citation_count,
                'case_type': case_type,
                'processed_at': datetime.now().isoformat(),
                'source': 'courtlistener_api'
            }

            return processed_case

        except Exception as e:
            logger.error(f"Error processing case {case.get('id')}: {str(e)}")
            return None

    def _extract_judges(self, case: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Extract judge information from case data.

        Args:
            case: Case data from API

        Returns:
            List of judge information
        """
        judges = []

        # Try to get judges from various fields
        panel = case.get('panel', [])
        if panel:
            for judge in panel:
                judge_info = {
                    'judge_id': str(judge.get('id', '')),
                    'judge_name': judge.get('name_full', ''),
                    'role': 'justice'
                }
                judges.append(judge_info)

        return judges

    def _extract_outcome(self, case: Dict[str, Any]) -> Optional[str]:
        """
        Extract case outcome from case data.

        Args:
            case: Case data from API

        Returns:
            Case outcome or None
        """
        # Look for outcome in various fields
        outcome_text = case.get('outcome', '').lower()

        # Map common outcomes
        if 'affirm' in outcome_text or 'upheld' in outcome_text:
            return 'AFFIRMED'
        elif 'reverse' in outcome_text or 'overturn' in outcome_text:
            return 'REVERSED'
        elif 'remand' in outcome_text:
            return 'REMANDED'
        elif 'dismiss' in outcome_text:
            return 'DISMISSED'
        elif 'grant' in outcome_text:
            return 'GRANTED'
        elif 'deny' in outcome_text or 'denied' in outcome_text:
            return 'DENIED'

        return None

    def _extract_case_facts(self, case: Dict[str, Any]) -> str:
        """
        Extract case facts/description.

        Args:
            case: Case data from API

        Returns:
            Case description/facts
        """
        # Try to get case description from various fields
        description = case.get('case_name', '')

        # Add docket number if available
        docket = case.get('docket_number', '')
        if docket:
            description += f" (Docket: {docket})"

        return description

    def _classify_case_type(self, case_name: str, case_facts: str) -> str:
        """
        Classify the type of case based on name and facts.

        Args:
            case_name: Case name
            case_facts: Case facts

        Returns:
            Case type classification
        """
        text = (case_name + ' ' + case_facts).lower()

        # Constitutional law
        if any(keyword in text for keyword in ['constitution', 'first amendment', 'due process', 'equal protection']):
            return 'constitutional'

        # Criminal law
        elif any(keyword in text for keyword in ['criminal', 'murder', 'felony', 'sentencing', 'death penalty']):
            return 'criminal'

        # Civil rights
        elif any(keyword in text for keyword in ['civil rights', 'discrimination', 'voting rights', 'affirmative action']):
            return 'civil_rights'

        # Administrative/regulatory
        elif any(keyword in text for keyword in ['agency', 'regulation', 'administrative', 'epa', 'fcc', 'sec']):
            return 'administrative'

        # Intellectual property
        elif any(keyword in text for keyword in ['patent', 'copyright', 'trademark', 'intellectual property']):
            return 'intellectual_property'

        # Tax law
        elif any(keyword in text for keyword in ['tax', 'irs', 'income tax', 'estate tax']):
            return 'tax'

        # Labor/employment
        elif any(keyword in text for keyword in ['labor', 'employment', 'union', 'wage', 'nlrb']):
            return 'labor'

        # Commercial/business
        elif any(keyword in text for keyword in ['contract', 'business', 'commercial', 'antitrust']):
            return 'commercial'

        # Default
        else:
            return 'general'

    def _save_progress(self, cases: List[Dict[str, Any]], count: int, final: bool = False):
        """
        Save current progress to file.

        Args:
            cases: List of processed cases
            count: Number of cases processed
            final: Whether this is the final save
        """
        try:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"scotus_cases_{count}_{timestamp}.json"

            if final:
                filename = "scotus_cases_final.json"

            filepath = os.path.join(self.output_dir, filename)

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    'metadata': {
                        'total_cases': len(cases),
                        'fetched_at': datetime.now().isoformat(),
                        'api_source': 'courtlistener',
                        'court': 'scotus'
                    },
                    'cases': cases
                }, f, indent=2, ensure_ascii=False)

            logger.info(f"Saved {len(cases)} cases to {filepath}")

        except Exception as e:
            logger.error(f"Error saving progress: {str(e)}")

def main():
    """Main function to run the SCOTUS data fetcher."""
    # Check for API key
    api_key = os.getenv('COURT_LISTENER_API_KEY')
    if not api_key:
        logger.error("COURT_LISTENER_API_KEY environment variable not set")
        print("Please set your CourtListener API key:")
        print("export COURT_LISTENER_API_KEY='your_api_key_here'")
        return

    # Initialize fetcher
    fetcher = SCOTUSDataFetcher(api_key=api_key)

    # Fetch cases
    print("Starting SCOTUS data fetch...")
    cases = fetcher.fetch_scotus_cases(
        start_year=2015,  # Focus on recent cases for better data quality
        end_year=2024,
        max_cases=500,   # Start with a manageable number
        save_progress=True
    )

    print(f"Successfully fetched {len(cases)} SCOTUS cases")

    # Print summary
    if cases:
        print("\nSample case:")
        sample = cases[0]
        print(f"- Case: {sample['case_name']}")
        print(f"- Date: {sample['date_filed']}")
        print(f"- Type: {sample['case_type']}")
        print(f"- Judges: {len(sample['judges'])}")
        print(f"- Outcome: {sample['outcome']}")

if __name__ == "__main__":
    main()

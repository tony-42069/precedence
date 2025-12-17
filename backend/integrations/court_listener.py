"""
CourtListener API Integration for Precedence

Provides access to CourtListener's REST API v4 and new Semantic Search API (launched Nov 5, 2025).
Handles Supreme Court cases, semantic search queries, and case detail retrieval.
"""

import os
import requests
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import time

# Configure logging
logger = logging.getLogger(__name__)

class CourtListenerClient:
    """Client for CourtListener API v4 integration."""

    def __init__(self):
        # Use v4 API as per official documentation
        self.base_url = os.getenv("COURT_LISTENER_BASE_URL", "https://www.courtlistener.com/api/rest/v4")
        self.api_key = os.getenv("COURT_LISTENER_API_KEY")

        if not self.api_key:
            logger.warning("COURT_LISTENER_API_KEY not found in environment variables")

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Token {self.api_key}" if self.api_key else "",
            "User-Agent": "Precedence/1.0 (https://precedence.market)"
        })

        # Rate limiting: 5000 requests per hour for authenticated users
        self.last_request_time = 0
        self.min_request_interval = 0.72  # ~720ms between requests (safe margin)

    def _rate_limit(self):
        """Enforce rate limiting."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time

        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            time.sleep(sleep_time)

        self.last_request_time = time.time()

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make a rate-limited request to CourtListener API."""
        self._rate_limit()

        url = f"{self.base_url}/{endpoint}"
        logger.info(f"Making request to: {url} with params: {params}")

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()

            data = response.json()
            result_count = data.get('count', 0) if 'count' in data else len(data.get('results', []))
            logger.info(f"Request successful, returned {result_count} results")
            return data

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            raise

    def search_cases(self,
                    query: str = "",
                    court: str = "",
                    filed_after: Optional[str] = None,
                    filed_before: Optional[str] = None,
                    semantic: bool = False,
                    limit: int = 20,
                    order_by: str = "dateFiled desc") -> Dict:
        """
        Search for cases using CourtListener v4 Search API.

        Args:
            query: Search query (keyword or semantic)
            court: Court identifier (scotus, ca1, etc.)
            filed_after: ISO date string (YYYY-MM-DD)
            filed_before: ISO date string (YYYY-MM-DD)
            semantic: Use semantic search (new Nov 5th 2025 feature)
            limit: Maximum results to return
            order_by: Sort order - "dateFiled desc" for recent first, "score desc" for relevance

        Returns:
            Dict containing search results
        """
        # V4 uses /search/ endpoint for case law search
        endpoint = "search/"

        params = {
            "type": "o",  # 'o' for opinions (case law)
            "order_by": order_by,  # Default: recent cases first (dateFiled desc)
        }

        # Add query
        if query:
            params["q"] = query

        # Add court filter
        if court:
            params["court"] = court

        # Add date filters (v4 uses filed_after/filed_before directly in search)
        if filed_after:
            params["filed_after"] = filed_after
        if filed_before:
            params["filed_before"] = filed_before

        # Add semantic search parameter (Nov 5th 2025 feature)
        if semantic:
            params["semantic"] = "true"
            logger.info(f"Using NEW semantic search for query: {query}")

        logger.info(f"Searching cases with params: {params}")
        return self._make_request(endpoint, params)

    def get_opinion_details(self, opinion_id: int) -> Dict:
        """
        Get detailed information about a specific opinion.

        Args:
            opinion_id: CourtListener opinion ID

        Returns:
            Dict containing opinion details
        """
        return self._make_request(f"opinions/{opinion_id}/")

    def get_cluster_details(self, cluster_id: int) -> Dict:
        """
        Get detailed information about an opinion cluster (a case).

        Args:
            cluster_id: CourtListener cluster ID

        Returns:
            Dict containing cluster/case details
        """
        return self._make_request(f"clusters/{cluster_id}/")

    def get_docket_details(self, docket_id: int) -> Dict:
        """
        Get detailed information about a docket.

        Args:
            docket_id: CourtListener docket ID

        Returns:
            Dict containing docket details
        """
        return self._make_request(f"dockets/{docket_id}/")

    def get_recent_supreme_court_cases(self, days: int = 30, limit: int = 50) -> Dict:
        """
        Get recent Supreme Court cases.

        Args:
            days: Number of days to look back
            limit: Maximum results

        Returns:
            Dict containing recent cases
        """
        filed_after = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        return self.search_cases(
            court="scotus",
            filed_after=filed_after,
            limit=limit
        )

    def semantic_search_cases(self, query: str, court: str = "", limit: int = 20) -> Dict:
        """
        Perform semantic search on cases using NEW Nov 5th 2025 feature.

        Args:
            query: Natural language query
            court: Optional court filter (e.g., 'scotus')
            limit: Maximum results

        Returns:
            Dict containing semantically relevant cases
        """
        return self.search_cases(query=query, court=court, semantic=True, limit=limit)

    def search_high_profile_cases(self, limit: int = 20) -> List[Dict]:
        """
        Search for high-profile legal cases that would be good for prediction markets.

        Focuses on:
        - Supreme Court cases
        - Constitutional law
        - Major regulatory decisions
        - High-profile criminal cases

        Returns:
            List of case dictionaries
        """
        # Search for recent Supreme Court cases
        recent_cases = self.get_recent_supreme_court_cases(days=365, limit=limit * 2)

        # Filter for high-profile cases (simple heuristic)
        high_profile_cases = []
        for case in recent_cases.get('results', []):
            # Look for cases with certain keywords
            case_name = case.get('caseName', '').lower()
            
            # High-profile keywords
            high_profile_keywords = [
                'united states', 'constitution', 'amendment', 'supreme court',
                'federal', 'government', 'president', 'election', 'voting',
                'abortion', 'guns', 'firearms', 'social media', 'internet',
                'privacy', 'surveillance', 'immigration', 'environment',
                'trump', 'biden', 'congress', 'senate', 'regulatory'
            ]
            
            if any(keyword in case_name for keyword in high_profile_keywords):
                high_profile_cases.append(case)

        logger.info(f"Found {len(high_profile_cases)} high-profile cases")
        return high_profile_cases[:limit]

# Global client instance
court_listener = CourtListenerClient()

# Convenience functions for easy access
def search_cases(query: str, **kwargs) -> Dict:
    """Convenience function for case search."""
    return court_listener.search_cases(query=query, **kwargs)

def get_opinion_details(opinion_id: int) -> Dict:
    """Convenience function for opinion details."""
    return court_listener.get_opinion_details(opinion_id)

def get_cluster_details(cluster_id: int) -> Dict:
    """Convenience function for cluster/case details."""
    return court_listener.get_cluster_details(cluster_id)

def semantic_search(query: str, limit: int = 20) -> Dict:
    """Convenience function for semantic search."""
    return court_listener.semantic_search_cases(query, limit)

if __name__ == "__main__":
    # Test the integration
    print("Testing CourtListener API v4 integration...")

    try:
        # Test basic search
        print("\n1. Testing basic keyword search...")
        results = search_cases("social media regulation", limit=5)
        print(f"✅ Found {results.get('count', 0)} total cases (showing 5)")

        # Test Supreme Court filter
        print("\n2. Testing Supreme Court filter...")
        scotus_results = search_cases("", court="scotus", limit=3)
        print(f"✅ Found {len(scotus_results.get('results', []))} SCOTUS cases")

        # Test semantic search (NEW Nov 5th feature)
        print("\n3. Testing NEW semantic search...")
        semantic_results = semantic_search("Supreme Court cases about technology and free speech", limit=3)
        print(f"✅ Semantic search found {len(semantic_results.get('results', []))} cases")

        # Test high-profile cases
        print("\n4. Testing high-profile case detection...")
        high_profile = court_listener.search_high_profile_cases(limit=5)
        print(f"✅ Found {len(high_profile)} high-profile cases")

        print("\n✅ CourtListener v4 integration test completed successfully!")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        print("Make sure COURT_LISTENER_API_KEY is set in your .env file")

"""
Court Listener API Integration Module

This module provides a comprehensive wrapper around the Court Listener API,
with specialized functionality for retrieving and processing data related to
judges, opinions, and oral arguments. The integration is optimized for the
Litigation Simulator project.
"""

import os
import json
import time
import asyncio
import httpx
import logging
import hashlib
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CourtListenerAPI:
    """
    A client for interacting with the Court Listener API, with local file-based caching.
    """
    
    BASE_URL = "https://www.courtlistener.com/api/rest/v4"
    CACHE_DIR = "./cl_cache"
    
    def __init__(self, api_token: Optional[str] = None):
        """
        Initialize the Court Listener API client.
        
        Args:
            api_token: API token for Court Listener. If None, will attempt to load from environment.
        """
        self.api_token = api_token or os.getenv("COURT_LISTENER_API_KEY")
        if not self.api_token:
            raise ValueError("API token is required. Set COURT_LISTENER_API_KEY environment variable or pass as parameter.")
        
        self.client = httpx.AsyncClient(
            headers={
                "Authorization": f"Token {self.api_token}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
        os.makedirs(self.CACHE_DIR, exist_ok=True)
        logger.info("CourtListenerAPI client initialized")
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
    
    async def close(self):
        """Close the HTTP client session."""
        await self.client.aclose()
        logger.info("CourtListenerAPI client closed")
    
    def _cache_path(self, key: str) -> str:
        h = hashlib.sha256(key.encode()).hexdigest()
        return os.path.join(self.CACHE_DIR, f"{h}.json")
    
    def _load_cache(self, key: str):
        path = self._cache_path(key)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return None
    
    def _save_cache(self, key: str, data):
        path = self._cache_path(key)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f)
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        params: Optional[Dict[str, Any]] = None, 
        data: Optional[Dict[str, Any]] = None,
        retry_count: int = 3
    ) -> Dict[str, Any]:
        """
        Make a request to the Court Listener API with retry logic and local file cache.
        """
        url = f"{self.BASE_URL}/{endpoint.lstrip('/')}"
        cache_key = f"{method}:{url}:{json.dumps(params, sort_keys=True) if params else ''}"
        cached = self._load_cache(cache_key)
        if cached is not None:
            logger.info(f"Loaded from cache: {url} {params}")
            return cached
        
        for attempt in range(retry_count):
            try:
                response = await self.client.request(
                    method=method,
                    url=url,
                    params=params,
                    json=data
                )
                
                response.raise_for_status()
                result = response.json()
                self._save_cache(cache_key, result)
                return result
                
            except httpx.HTTPStatusError as e:
                # Handle rate limiting
                if e.response.status_code == 429:
                    retry_after = int(e.response.headers.get("Retry-After", 2 ** attempt))
                    logger.warning(f"Rate limited. Retrying after {retry_after} seconds. Attempt {attempt+1}/{retry_count}")
                    await asyncio.sleep(retry_after)
                    continue
                if e.response.status_code == 401:
                    logger.error("Unauthorized. Check your API token.")
                    raise
                if attempt < retry_count - 1:
                    logger.warning(f"Request failed with {e}. Retrying {attempt+1}/{retry_count}")
                    await asyncio.sleep(2 ** attempt)
                    continue
                logger.error(f"Request failed after {retry_count} attempts: {e}")
                raise
            except httpx.RequestError as e:
                if attempt < retry_count - 1:
                    logger.warning(f"Request error: {e}. Retrying {attempt+1}/{retry_count}")
                    await asyncio.sleep(2 ** attempt)
                    continue
                logger.error(f"Request error after {retry_count} attempts: {e}")
                raise
    
    async def get_judge(self, judge_id: str) -> Dict[str, Any]:
        """
        Get a specific judge by ID.
        
        Args:
            judge_id: The Court Listener ID of the judge
            
        Returns:
            Judge data
        """
        logger.info(f"Fetching judge with ID {judge_id}")
        return await self._make_request("GET", f"/people/{judge_id}/")
    
    async def search_judges(
        self, 
        name: Optional[str] = None,
        court: Optional[str] = None,
        position_type: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search for judges based on various criteria.
        
        Args:
            name: Judge name to search for
            court: Court identifier
            position_type: Type of position (e.g., "Judge", "Justice")
            limit: Maximum number of results to return
            offset: Pagination offset
            
        Returns:
            Search results containing judge data
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if name:
            params["name"] = name
        
        if court:
            params["court"] = court
            
        if position_type:
            params["position_type"] = position_type
        
        logger.info(f"Searching judges with params: {params}")
        return await self._make_request("GET", "/people/", params=params)
    
    async def get_opinion(self, opinion_id: str) -> Dict[str, Any]:
        """
        Get a specific opinion by ID.
        
        Args:
            opinion_id: The Court Listener ID of the opinion
            
        Returns:
            Opinion data
        """
        logger.info(f"Fetching opinion with ID {opinion_id}")
        return await self._make_request("GET", f"/opinions/{opinion_id}/")
    
    async def search_opinions(
        self,
        case_name: Optional[str] = None,
        judge_id: Optional[str] = None,
        court: Optional[str] = None,
        nature_of_suit: Optional[str] = None,
        filed_after: Optional[str] = None,
        filed_before: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search for opinions based on various criteria.
        
        Args:
            case_name: Case name to search for
            judge_id: ID of the judge who wrote the opinion
            court: Court identifier
            nature_of_suit: Nature of the case
            filed_after: Include opinions filed after this date (YYYY-MM-DD)
            filed_before: Include opinions filed before this date (YYYY-MM-DD)
            limit: Maximum number of results to return
            offset: Pagination offset
            
        Returns:
            Search results containing opinion data
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if case_name:
            params["case_name"] = case_name
            
        if judge_id:
            params["author_id"] = judge_id
            
        if court:
            params["court"] = court
            
        if nature_of_suit:
            params["nature_of_suit"] = nature_of_suit
            
        if filed_after:
            params["filed_after"] = filed_after
            
        if filed_before:
            params["filed_before"] = filed_before
        
        logger.info(f"Searching opinions with params: {params}")
        return await self._make_request("GET", "/opinions/", params=params)
    
    async def get_oral_argument(self, argument_id: str) -> Dict[str, Any]:
        """
        Get a specific oral argument by ID.
        
        Args:
            argument_id: The Court Listener ID of the oral argument
            
        Returns:
            Oral argument data
        """
        logger.info(f"Fetching oral argument with ID {argument_id}")
        return await self._make_request("GET", f"/audio/{argument_id}/")
    
    async def search_oral_arguments(
        self,
        case_name: Optional[str] = None,
        judge_id: Optional[str] = None,
        court: Optional[str] = None,
        argued_after: Optional[str] = None,
        argued_before: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search for oral arguments based on various criteria.
        
        Args:
            case_name: Case name to search for
            judge_id: ID of the judge who presided
            court: Court identifier
            argued_after: Include arguments made after this date (YYYY-MM-DD)
            argued_before: Include arguments made before this date (YYYY-MM-DD)
            limit: Maximum number of results to return
            offset: Pagination offset
            
        Returns:
            Search results containing oral argument data
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if case_name:
            params["case_name"] = case_name
            
        if judge_id:
            params["panel__id"] = judge_id
            
        if court:
            params["court"] = court
            
        if argued_after:
            params["argued_after"] = argued_after
            
        if argued_before:
            params["argued_before"] = argued_before
        
        logger.info(f"Searching oral arguments with params: {params}")
        return await self._make_request("GET", "/audio/", params=params)
    
    async def get_docket(self, docket_id: str) -> Dict[str, Any]:
        """
        Get a specific docket by ID.
        
        Args:
            docket_id: The Court Listener ID of the docket
            
        Returns:
            Docket data
        """
        logger.info(f"Fetching docket with ID {docket_id}")
        return await self._make_request("GET", f"/dockets/{docket_id}/")
    
    async def search_dockets(
        self,
        case_name: Optional[str] = None,
        court: Optional[str] = None,
        nature_of_suit: Optional[str] = None,
        judge_id: Optional[str] = None,
        limit: int = 20,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Search for dockets based on various criteria.
        
        Args:
            case_name: Case name to search for
            court: Court identifier
            nature_of_suit: Nature of the case
            judge_id: ID of the presiding judge
            limit: Maximum number of results to return
            offset: Pagination offset
            
        Returns:
            Search results containing docket data
        """
        params = {
            "limit": limit,
            "offset": offset
        }
        
        if case_name:
            params["case_name"] = case_name
            
        if court:
            params["court"] = court
            
        if nature_of_suit:
            params["nature_of_suit"] = nature_of_suit
            
        if judge_id:
            params["assigned_to_id"] = judge_id
        
        logger.info(f"Searching dockets with params: {params}")
        return await self._make_request("GET", "/dockets/", params=params)
    
    async def get_court(self, court_id: str) -> Dict[str, Any]:
        """
        Get a specific court by ID.
        
        Args:
            court_id: The Court Listener ID of the court
            
        Returns:
            Court data
        """
        logger.info(f"Fetching court with ID {court_id}")
        return await self._make_request("GET", f"/courts/{court_id}/")
    
    async def list_courts(self) -> Dict[str, Any]:
        """
        List all available courts.
            
        Returns:
            List of courts
        """
        logger.info("Listing all courts")
        return await self._make_request("GET", "/courts/")
    
    async def download_opinion_text(self, opinion_id: str) -> str:
        """
        Download the full text of an opinion.
        
        Args:
            opinion_id: The Court Listener ID of the opinion
            
        Returns:
            Full text of the opinion
        """
        logger.info(f"Downloading text for opinion with ID {opinion_id}")
        
        # First get the opinion metadata to find the download link
        opinion_data = await self.get_opinion(opinion_id)
        
        if "plain_text" not in opinion_data or not opinion_data["plain_text"]:
            raise ValueError("Plain text not available for this opinion")
        
        # Get the plain text content
        text_url = opinion_data["plain_text"]
        
        # Make a direct request to the text URL
        async with httpx.AsyncClient() as client:
            response = await client.get(text_url)
            response.raise_for_status()
            return response.text
    
    async def download_oral_argument_audio(self, argument_id: str, output_path: str) -> str:
        """
        Download the audio file of an oral argument.
        
        Args:
            argument_id: The Court Listener ID of the oral argument
            output_path: Path to save the audio file
            
        Returns:
            Path to the downloaded file
        """
        logger.info(f"Downloading audio for oral argument with ID {argument_id}")
        
        # First get the argument metadata to find the download link
        argument_data = await self.get_oral_argument(argument_id)
        
        if "download_url" not in argument_data or not argument_data["download_url"]:
            raise ValueError("Audio file not available for this oral argument")
        
        # Get the download URL
        download_url = argument_data["download_url"]
        
        # Make a direct request to download the file
        async with httpx.AsyncClient() as client:
            response = await client.get(download_url)
            response.raise_for_status()
            
            # Write the content to the output file
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(response.content)
                
            return output_path

    async def get_docket_entries(self, docket_id: str, limit: int = 20) -> List[Dict]:
        """
        Get docket entries (timeline of events) for a case.
        
        Returns filings, motions, hearings, orders, etc.
        
        Args:
            docket_id: CourtListener docket ID
            limit: Maximum entries to return
            
        Returns:
            List of docket entry dictionaries with timeline events
        """
        try:
            logger.info(f"Getting docket entries for docket {docket_id}")
            
            # Fetch docket details
            docket = await self._make_request("GET", f"/dockets/{docket_id}/")
            
            # Extract docket entries
            entries = docket.get('docket_entries', [])
            
            # Sort by date (most recent first)
            sorted_entries = sorted(
                entries, 
                key=lambda x: x.get('date_filed', ''), 
                reverse=True
            )
            
            # Format and limit
            timeline = []
            for entry in sorted_entries[:limit]:
                timeline.append({
                    'date': entry.get('date_filed'),
                    'description': entry.get('description', 'Entry'),
                    'entry_number': entry.get('entry_number'),
                    'page_count': entry.get('page_count')
                })
            
            logger.info(f"Retrieved {len(timeline)} docket entries for docket {docket_id}")
            return timeline
            
        except Exception as e:
            logger.error(f"Failed to get docket entries: {e}")
            return []
    
    async def get_case_parties(self, docket_id: str) -> Dict[str, List[str]]:
        """
        Get parties involved in a case (plaintiffs, defendants, attorneys).
        
        Args:
            docket_id: CourtListener docket ID
            
        Returns:
            Dict with 'plaintiffs', 'defendants', 'attorneys' lists
        """
        try:
            logger.info(f"Getting parties for docket {docket_id}")
            
            docket = await self._make_request("GET", f"/dockets/{docket_id}/")
            
            parties = {
                'plaintiffs': [],
                'defendants': [],
                'attorneys': []
            }
            
            # Extract party information
            for party in docket.get('parties', []):
                party_type = party.get('party_type', {})
                if isinstance(party_type, dict):
                    party_type_name = party_type.get('name', '').lower()
                else:
                    party_type_name = str(party_type).lower()
                    
                party_name = party.get('name', '')
                
                if 'plaintiff' in party_type_name or 'petitioner' in party_type_name:
                    parties['plaintiffs'].append(party_name)
                elif 'defendant' in party_type_name or 'respondent' in party_type_name:
                    parties['defendants'].append(party_name)
                
                # Extract attorneys
                for attorney in party.get('attorneys', []):
                    attorney_name = attorney.get('name', '')
                    if attorney_name and attorney_name not in parties['attorneys']:
                        parties['attorneys'].append(attorney_name)
            
            logger.info(f"Retrieved parties: {len(parties['plaintiffs'])} plaintiffs, {len(parties['defendants'])} defendants")
            return parties
            
        except Exception as e:
            logger.error(f"Failed to get case parties: {e}")
            return {'plaintiffs': [], 'defendants': [], 'attorneys': []}
    
    async def get_enriched_case_details(self, cluster_id: str) -> Dict:
        """
        Get comprehensive case details including timeline, parties, and metadata.
        
        This is the MAIN method to use for rich case information.
        
        Args:
            cluster_id: CourtListener cluster ID
            
        Returns:
            Dict with comprehensive case information
        """
        try:
            logger.info(f"Getting enriched details for cluster {cluster_id}")
            
            # Get base cluster/case data
            cluster = await self._make_request("GET", f"/clusters/{cluster_id}/")
            
            # Get docket ID from cluster
            docket_id = cluster.get('docket')
            
            enriched = {
                'id': cluster_id,
                'caseName': cluster.get('case_name', ''),
                'docketNumber': cluster.get('docket_number', ''),
                'court': cluster.get('court', ''),
                'dateFiled': cluster.get('date_filed', ''),
                'judge': cluster.get('judges', ''),
                'citations': cluster.get('citations', []),
                'summary': cluster.get('syllabus', '') or cluster.get('headnotes', ''),
                'procedural_history': cluster.get('procedural_history', ''),
                'disposition': cluster.get('disposition', ''),
                'timeline': [],
                'parties': {'plaintiffs': [], 'defendants': [], 'attorneys': []}
            }
            
            # Fetch additional details if docket ID available
            if docket_id:
                # Extract just the numeric ID if it's a URL
                if isinstance(docket_id, str) and '/' in docket_id:
                    docket_id = docket_id.rstrip('/').split('/')[-1]
                
                # Get timeline
                enriched['timeline'] = await self.get_docket_entries(str(docket_id), limit=10)
                
                # Get parties
                enriched['parties'] = await self.get_case_parties(str(docket_id))
            
            logger.info(f"Successfully enriched case {cluster_id}")
            return enriched
            
        except Exception as e:
            logger.error(f"Failed to enrich case details: {e}")
            # Return basic structure even on failure
            return {
                'id': cluster_id,
                'error': str(e),
                'timeline': [],
                'parties': {'plaintiffs': [], 'defendants': [], 'attorneys': []}
            }

# Example usage
async def main():
    """Example usage of the CourtListener API client."""
    # Initialize the client
    async with CourtListenerAPI() as api:
        # Search for judges
        judges = await api.search_judges(name="Roberts")
        print(f"Found {len(judges['results'])} judges matching 'Roberts'")
        
        # Search for opinions in commercial real estate cases
        opinions = await api.search_opinions(nature_of_suit="real property")
        print(f"Found {len(opinions['results'])} opinions related to real property")
        
        # Get a specific judge
        if judges['results']:
            judge_id = judges['results'][0]['id']
            judge = await api.get_judge(judge_id)
            print(f"Judge details: {judge['name']}")
            
            # Get opinions authored by this judge
            judge_opinions = await api.search_opinions(judge_id=judge_id)
            print(f"Found {len(judge_opinions['results'])} opinions authored by {judge['name']}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

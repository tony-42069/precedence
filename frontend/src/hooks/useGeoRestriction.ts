/**
 * useGeoRestriction Hook
 * 
 * Checks if the user is in a Polymarket-restricted region.
 * 
 * Restricted regions include:
 * - United States
 * - France
 * - Other OFAC-sanctioned countries
 * 
 * Note: This is a client-side check for UX purposes only.
 * The actual enforcement happens server-side via Cloudflare.
 */

'use client';

import { useState, useEffect } from 'react';

// Restricted country codes (ISO 3166-1 alpha-2)
// Based on Polymarket Terms of Use
const RESTRICTED_COUNTRIES = [
  'US', // United States
  'FR', // France
  // OFAC Sanctioned
  'CU', // Cuba
  'IR', // Iran
  'KP', // North Korea
  'SY', // Syria
  'RU', // Russia (Crimea region - simplified to whole country)
  // Other reported restrictions
  'BE', // Belgium (gambling laws)
  'NL', // Netherlands (gambling laws)
];

// Countries where Polymarket US expansion is expected
const US_EXPANSION_COUNTRIES = ['US'];

interface GeoData {
  country: string;
  countryCode: string;
  region?: string;
}

interface GeoRestrictionState {
  isLoading: boolean;
  isRestricted: boolean;
  isUSUser: boolean;
  geoData: GeoData | null;
  error: string | null;
  restrictionMessage: string | null;
}

export const useGeoRestriction = () => {
  const [state, setState] = useState<GeoRestrictionState>({
    isLoading: true,
    isRestricted: false,
    isUSUser: false,
    geoData: null,
    error: null,
    restrictionMessage: null,
  });

  useEffect(() => {
    const checkGeoLocation = async () => {
      try {
        // Use a free geo-IP service
        // Note: For production, consider using a more reliable paid service
        const response = await fetch('https://ipapi.co/json/', {
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch location data');
        }

        const data = await response.json();

        const countryCode = data.country_code || data.country;
        const country = data.country_name || countryCode;
        const region = data.region; // State/Province name

        const geoData: GeoData = {
          country,
          countryCode,
          region,
        };

        const isRestricted = RESTRICTED_COUNTRIES.includes(countryCode);
        const isUSUser = countryCode === 'US';

        let restrictionMessage: string | null = null;

        if (isRestricted) {
          if (isUSUser) {
            restrictionMessage = 
              'Trading is not currently available in the United States. ' +
              'Polymarket is working with regulators to enable US access soon. ' +
              'Check back for updates!';
          } else {
            restrictionMessage = 
              `Trading is not available to people or companies who are residents of, ` +
              `or are located, incorporated or have a registered agent in, ${country} ` +
              `or other restricted territories.`;
          }
        }

        setState({
          isLoading: false,
          isRestricted,
          isUSUser,
          geoData,
          error: null,
          restrictionMessage,
        });

      } catch (err: any) {
        console.warn('⚠️ Geo-location check failed:', err.message);
        
        // Don't block users if geo-check fails - let Polymarket handle it
        setState({
          isLoading: false,
          isRestricted: false,
          isUSUser: false,
          geoData: null,
          error: err.message,
          restrictionMessage: null,
        });
      }
    };

    checkGeoLocation();
  }, []);

  return state;
};

// Export constants for use elsewhere
export { RESTRICTED_COUNTRIES, US_EXPANSION_COUNTRIES };

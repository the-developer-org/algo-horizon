/**
 * API utilities for company name -> instrument key mapping.
 */

export interface KeyMapping {
  [companyName: string]: string;
}

const INSTRUMENT_KEY_MAPPING_PATH = '/api/instruments/get-mapping';

let instrumentKeyMappingRequest: Promise<KeyMapping> | null = null;

function backendBaseUrl(): string {
  const backend = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  if (!backend) {
    throw new Error('Backend URL is not configured');
  }
  return backend;
}

function parseInstrumentKeyMapping(payload: unknown): KeyMapping {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Instrument key mapping response was not an object');
  }

  const mapping: KeyMapping = {};
  for (const [companyName, instrumentKey] of Object.entries(payload)) {
    if (typeof instrumentKey === 'string' && instrumentKey.length > 0) {
      mapping[companyName] = instrumentKey;
    }
  }
  return mapping;
}

/**
 * Company name -> instrument key from GET /api/instruments/get-mapping.
 * Concurrent callers share one in-flight request.
 */
export const fetchKeyMapping = async (): Promise<KeyMapping> => {
  if (instrumentKeyMappingRequest) {
    return instrumentKeyMappingRequest;
  }

  const request = (async () => {
    const response = await fetch(`${backendBaseUrl()}${INSTRUMENT_KEY_MAPPING_PATH}`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return parseInstrumentKeyMapping(await response.json());
  })();

  instrumentKeyMappingRequest = request;

  try {
    return await request;
  } catch (error) {
    if (instrumentKeyMappingRequest === request) {
      instrumentKeyMappingRequest = null;
    }
    console.error('Error fetching KeyMapping:', error);
    throw new Error('Failed to load company data');
  }
};

/**
 * Utility function to get instrument key for a company name
 * @param companyName - The company name to look up
 * @param keyMapping - The KeyMapping object
 * @returns string | undefined - The instrument key or undefined if not found
 */
export const getInstrumentKey = (companyName: string, keyMapping: KeyMapping): string | undefined => {
  return keyMapping[companyName];
};

/**
 * Utility function to search companies by name (case-insensitive)
 * @param searchTerm - The search term
 * @param keyMapping - The KeyMapping object
 * @param limit - Maximum number of results (default: 8)
 * @returns string[] - Array of matching company names
 */
export const searchCompanies = (searchTerm: string, keyMapping: KeyMapping, limit: number = 8): string[] => {
  if (!searchTerm) return [];
  
  return Object.keys(keyMapping)
    .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, limit);
};

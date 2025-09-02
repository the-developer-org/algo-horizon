/**
 * API utilities for Redis/Upstash operations
 */

export interface KeyMappingResponse {
  result: string;
}

export interface KeyMapping {
  [companyName: string]: string;
}

/**
 * Fetches the KeyMapping data from Upstash Redis
 * @returns Promise<KeyMapping> - Object mapping company names to instrument keys
 * @throws Error if the request fails
 */
export const fetchKeyMapping = async (): Promise<KeyMapping> => {
  try {
    const response = await fetch("https://saved-dassie-60359.upstash.io/get/KeyMapping", {
      method: "GET",
      headers: {
        Authorization: `Bearer AevHAAIjcDE5ZjcwOWVlMmQzNWI0MmE5YTA0NzgxN2VhN2E0MTNjZHAxMA`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: KeyMappingResponse = await response.json();
    
    if (!data.result) {
      throw new Error('No result data in response');
    }

    const mapping: KeyMapping = JSON.parse(data.result);
    return mapping;
  } catch (error) {
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

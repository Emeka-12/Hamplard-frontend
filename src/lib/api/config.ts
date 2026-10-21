// src/lib/api/config.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Get the API base URL. Fails loudly in production if not configured.
 * Defaults to localhost in development.
 */
export const getApiUrl = (): string => {
  if (!API_URL) {
    // Only log in production or if explicitly checking
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      console.error(
        '❌ WARNING: NEXT_PUBLIC_API_URL is not set. ' +
        'Requests will fall back to http://localhost:3000/api/v1, which will not work in production.',
      );
    }
    return 'http://localhost:3000/api/v1';
  }
  return API_URL;
};

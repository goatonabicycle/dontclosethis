// API Client for Don't Close This - Global High Scores
// Add this script to your HTML: <script src="api-client.js" defer></script>

// IMPORTANT: Update this with your actual Cloudflare Worker URL
const API_BASE_URL = 'https://dontclosethis-api.YOUR-SUBDOMAIN.workers.dev';

// Cache for API status
let apiAvailable = true;
let lastApiCheck = 0;
const API_CHECK_INTERVAL = 60000; // Check every 60 seconds

/**
 * Submit a score to the global leaderboard
 * @param {string} playerName - Player's name (1-10 characters)
 * @param {number} level - Level reached (1-13)
 * @param {number} timeElapsed - Time in seconds
 * @returns {Promise<Object>} Response with rank and success status
 */
async function submitScoreToAPI(playerName, level, timeElapsed) {
  if (!apiAvailable && Date.now() - lastApiCheck < API_CHECK_INTERVAL) {
    console.log('API unavailable, skipping submission');
    return { success: false, offline: true };
  }

  const sessionId = getOrCreateSessionId();

  try {
    const response = await fetch(`${API_BASE_URL}/api/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        playerName: playerName.toUpperCase().trim(),
        level: level,
        timeElapsed: timeElapsed,
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API error:', errorData);
      apiAvailable = false;
      lastApiCheck = Date.now();
      return { success: false, error: errorData.error };
    }

    const data = await response.json();
    apiAvailable = true;
    lastApiCheck = Date.now();

    console.log('Score submitted successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to submit score to API:', error);
    apiAvailable = false;
    lastApiCheck = Date.now();
    return { success: false, offline: true, error: error.message };
  }
}

/**
 * Fetch global leaderboard scores
 * @param {number} limit - Number of scores to fetch (default 10)
 * @param {string} playerName - Optional: get specific player's rank
 * @returns {Promise<Object>} Leaderboard data with globalTop and optional playerRank
 */
async function fetchScoresFromAPI(limit = 10, playerName = null) {
  if (!apiAvailable && Date.now() - lastApiCheck < API_CHECK_INTERVAL) {
    console.log('API unavailable, using local scores');
    return null;
  }

  try {
    const url = new URL(`${API_BASE_URL}/api/scores`);
    url.searchParams.set('limit', limit.toString());
    if (playerName) {
      url.searchParams.set('playerName', playerName.toUpperCase().trim());
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('Failed to fetch scores:', response.status);
      apiAvailable = false;
      lastApiCheck = Date.now();
      return null;
    }

    const data = await response.json();
    apiAvailable = true;
    lastApiCheck = Date.now();

    return data;
  } catch (error) {
    console.error('Failed to fetch scores from API:', error);
    apiAvailable = false;
    lastApiCheck = Date.now();
    return null;
  }
}

/**
 * Check API health status
 * @returns {Promise<boolean>} True if API is available
 */
async function checkAPIHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
    });

    const isHealthy = response.ok;
    apiAvailable = isHealthy;
    lastApiCheck = Date.now();

    return isHealthy;
  } catch (error) {
    console.error('API health check failed:', error);
    apiAvailable = false;
    lastApiCheck = Date.now();
    return false;
  }
}

/**
 * Get or create a unique session ID for this browser
 * @returns {string} Session UUID
 */
function getOrCreateSessionId() {
  const STORAGE_KEY = 'gameSessionId';

  try {
    let sessionId = localStorage.getItem(STORAGE_KEY);

    if (!sessionId) {
      // Generate a simple UUID
      sessionId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

      localStorage.setItem(STORAGE_KEY, sessionId);
    }

    return sessionId;
  } catch (error) {
    console.error('Failed to get/create session ID:', error);
    return 'unknown-session';
  }
}

/**
 * Get API status
 * @returns {Object} API availability status
 */
function getAPIStatus() {
  return {
    available: apiAvailable,
    lastCheck: lastApiCheck,
  };
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    submitScoreToAPI,
    fetchScoresFromAPI,
    checkAPIHealth,
    getAPIStatus,
  };
}

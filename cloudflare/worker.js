/**
 * Cloudflare Worker for Don't Close This - Global High Scores API
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://dash.cloudflare.com
 * 2. Navigate to Workers & Pages > Overview
 * 3. Click "Create Application" > "Create Worker"
 * 4. Name it: "dontclosethis-api"
 * 5. Click "Deploy" then "Edit Code"
 * 6. Copy this entire file and paste it into the editor
 * 7. Click "Save and Deploy"
 *
 * DATABASE SETUP:
 * 1. Go to Workers & Pages > D1
 * 2. Click "Create Database"
 * 3. Name it: "dontclosethis_scores"
 * 4. Click on the database, go to "Console" tab
 * 5. Run the SQL from schema.sql (copy/paste each CREATE statement)
 * 6. Go back to your Worker, click "Settings" > "Variables"
 * 7. Under "D1 Database Bindings", click "Add binding"
 * 8. Variable name: "DB", select your database
 * 9. Click "Save"
 *
 * SECURITY:
 * Update ALLOWED_ORIGINS below with your actual domain(s)
 */

// CONFIGURATION - Update these!
const CONFIG = {
  // Add your domain(s) here - remove the example
  ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://your-domain.com', // Replace with your actual domain
  ],
  RATE_LIMIT_PER_MINUTE: 10,
  MAX_SCORES_RETURNED: 50,
  MIN_TIME_PER_LEVEL: 2, // Anti-cheat: minimum seconds per level
  MAX_LEVELS: 20, // Maximum number of levels in the game
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': CONFIG.ALLOWED_ORIGINS.includes(origin) ? origin : CONFIG.ALLOWED_ORIGINS[0],
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // Origin validation
    if (!CONFIG.ALLOWED_ORIGINS.includes(origin) && origin !== null) {
      return jsonResponse({ error: 'Origin not allowed' }, 403, corsHeaders);
    }

    try {
      // Route requests
      if (url.pathname === '/api/scores' && request.method === 'POST') {
        return await submitScore(request, env, corsHeaders);
      }

      if (url.pathname === '/api/scores' && request.method === 'GET') {
        return await getScores(request, env, corsHeaders);
      }

      if (url.pathname === '/api/session' && request.method === 'POST') {
        return await startSession(request, env, corsHeaders);
      }

      if (url.pathname === '/api/attempt' && request.method === 'POST') {
        return await recordAttempt(request, env, corsHeaders);
      }

      if (url.pathname === '/api/analytics' && request.method === 'GET') {
        return await getAnalytics(request, env, corsHeaders);
      }

      if (url.pathname === '/api/health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() }, 200, corsHeaders);
      }

      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
    } catch (error) {
      console.error('Error:', error);
      return jsonResponse({ error: 'Internal Server Error', details: error.message }, 500, corsHeaders);
    }
  }
};

/**
 * Submit a new high score
 */
async function submitScore(request, env, corsHeaders) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limiting check
  const rateLimitKey = `rate_limit:${ip}`;
  const rateLimitExceeded = await checkRateLimit(env, rateLimitKey);
  if (rateLimitExceeded) {
    return jsonResponse({
      error: 'Rate limit exceeded. Please wait before submitting again.'
    }, 429, corsHeaders);
  }

  // Parse request
  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const { playerName, level, timeElapsed, sessionId } = data;

  // Validation
  if (!playerName || typeof playerName !== 'string') {
    return jsonResponse({ error: 'Player name is required' }, 400, corsHeaders);
  }

  if (playerName.length < 1 || playerName.length > 10) {
    return jsonResponse({ error: 'Player name must be 1-10 characters' }, 400, corsHeaders);
  }

  if (!Number.isInteger(level) || level < 1 || level > CONFIG.MAX_LEVELS) {
    return jsonResponse({ error: `Invalid level (must be 1-${CONFIG.MAX_LEVELS})` }, 400, corsHeaders);
  }

  if (!Number.isInteger(timeElapsed) || timeElapsed < 0) {
    return jsonResponse({ error: 'Invalid time elapsed' }, 400, corsHeaders);
  }

  // Anti-cheat: Check if time is suspiciously fast
  const minRealisticTime = level * CONFIG.MIN_TIME_PER_LEVEL;
  if (timeElapsed < minRealisticTime) {
    return jsonResponse({
      error: 'Time too fast for this level',
      minTime: minRealisticTime
    }, 400, corsHeaders);
  }

  // Hash IP for privacy
  const ipHash = await hashString(ip);

  // Insert score into database
  try {
    await env.DB.prepare(`
      INSERT INTO high_scores
      (player_name, level, time_elapsed, timestamp, ip_hash, session_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      playerName.toUpperCase().trim(),
      level,
      timeElapsed,
      Date.now(),
      ipHash,
      sessionId || 'unknown'
    ).run();
  } catch (error) {
    console.error('Database error:', error);
    return jsonResponse({ error: 'Failed to save score' }, 500, corsHeaders);
  }

  // Calculate player's rank
  const rankResult = await env.DB.prepare(`
    SELECT COUNT(*) as better_scores
    FROM (
      SELECT player_name, MAX(level) as max_level, MIN(time_elapsed) as best_time
      FROM high_scores
      GROUP BY player_name
    ) scores
    WHERE max_level > ? OR (max_level = ? AND best_time < ?)
  `).bind(level, level, timeElapsed).first();

  const rank = (rankResult?.better_scores || 0) + 1;
  const isTopTen = rank <= 10;

  return jsonResponse({
    success: true,
    rank: rank,
    isTopTen: isTopTen,
    message: isTopTen ? '🎉 You made the top 10!' : 'Score saved!'
  }, 200, corsHeaders);
}

/**
 * Get leaderboard scores
 */
async function getScores(request, env, corsHeaders) {
  const url = new URL(request.url);
  const limit = Math.min(
    parseInt(url.searchParams.get('limit') || '10'),
    CONFIG.MAX_SCORES_RETURNED
  );
  const playerName = url.searchParams.get('playerName')?.toUpperCase().trim();

  try {
    // Get global top scores (best score per player)
    const topScores = await env.DB.prepare(`
      SELECT
        player_name,
        MAX(level) as level,
        MIN(CASE WHEN level = MAX(level) THEN time_elapsed END) as time_elapsed
      FROM high_scores
      GROUP BY player_name
      ORDER BY level DESC, time_elapsed ASC
      LIMIT ?
    `).bind(limit).all();

    const globalTop = (topScores.results || []).map((score, index) => ({
      rank: index + 1,
      playerName: score.player_name,
      level: score.level,
      timeElapsed: score.time_elapsed
    }));

    // Get specific player's rank if requested
    let playerRank = null;
    if (playerName) {
      const playerScore = await env.DB.prepare(`
        SELECT
          MAX(level) as level,
          MIN(CASE WHEN level = (SELECT MAX(level) FROM high_scores WHERE player_name = ?)
              THEN time_elapsed END) as time_elapsed
        FROM high_scores
        WHERE player_name = ?
      `).bind(playerName, playerName).first();

      if (playerScore && playerScore.level) {
        const rankResult = await env.DB.prepare(`
          SELECT COUNT(*) as better_scores
          FROM (
            SELECT
              player_name,
              MAX(level) as max_level,
              MIN(CASE WHEN level = MAX(level) THEN time_elapsed END) as best_time
            FROM high_scores
            GROUP BY player_name
          ) scores
          WHERE max_level > ? OR (max_level = ? AND best_time < ?)
        `).bind(playerScore.level, playerScore.level, playerScore.time_elapsed).first();

        playerRank = {
          rank: (rankResult?.better_scores || 0) + 1,
          playerName: playerName,
          level: playerScore.level,
          timeElapsed: playerScore.time_elapsed
        };
      }
    }

    // Get total player count
    const statsResult = await env.DB.prepare(`
      SELECT
        COUNT(DISTINCT player_name) as total_players,
        COUNT(*) as total_scores
      FROM high_scores
    `).first();

    return jsonResponse({
      globalTop,
      playerRank,
      stats: {
        totalPlayers: statsResult?.total_players || 0,
        totalScores: statsResult?.total_scores || 0
      }
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Database error:', error);
    return jsonResponse({ error: 'Failed to fetch scores' }, 500, corsHeaders);
  }
}

/**
 * Simple rate limiting using environment KV storage
 */
async function checkRateLimit(env, key) {
  // Note: This is a simple implementation
  // For production, consider using Cloudflare Rate Limiting rules
  return false; // Disabled for now, enable when you have KV namespace
}

/**
 * Hash a string using SHA-256
 */
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper to return JSON responses
 */
function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders
    }
  });
}

// ============================================
// ANALYTICS FUNCTIONS
// ============================================

/**
 * Start a new game session
 */
async function startSession(request, env, corsHeaders) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await hashString(ip);

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const sessionId = data.sessionId || crypto.randomUUID();

  try {
    await env.DB.prepare(`
      INSERT INTO game_sessions (session_id, started_at, ip_hash)
      VALUES (?, ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET started_at = ?
    `).bind(sessionId, Date.now(), ipHash, Date.now()).run();

    return jsonResponse({
      success: true,
      sessionId: sessionId
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Session error:', error);
    return jsonResponse({ error: 'Failed to start session' }, 500, corsHeaders);
  }
}

/**
 * Record a level attempt (success or failure)
 */
async function recordAttempt(request, env, corsHeaders) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const ipHash = await hashString(ip);

  let data;
  try {
    data = await request.json();
  } catch (e) {
    return jsonResponse({ error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const { sessionId, level, success, timeSpent } = data;

  // Validation
  if (!sessionId) {
    return jsonResponse({ error: 'Session ID required' }, 400, corsHeaders);
  }

  if (!Number.isInteger(level) || level < 1 || level > CONFIG.MAX_LEVELS) {
    return jsonResponse({ error: 'Invalid level' }, 400, corsHeaders);
  }

  if (typeof success !== 'boolean') {
    return jsonResponse({ error: 'Success must be boolean' }, 400, corsHeaders);
  }

  if (!Number.isInteger(timeSpent) || timeSpent < 0) {
    return jsonResponse({ error: 'Invalid time spent' }, 400, corsHeaders);
  }

  try {
    // Record the attempt
    await env.DB.prepare(`
      INSERT INTO level_attempts (session_id, level, success, time_spent, timestamp, ip_hash)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(sessionId, level, success ? 1 : 0, timeSpent, Date.now(), ipHash).run();

    // Update session's max level if this was a success
    if (success) {
      await env.DB.prepare(`
        UPDATE game_sessions
        SET max_level_reached = MAX(max_level_reached, ?)
        WHERE session_id = ?
      `).bind(level + 1, sessionId).run();
    }

    // Update daily stats (upsert)
    const today = new Date().toISOString().split('T')[0];
    await env.DB.prepare(`
      INSERT INTO daily_stats (date, level, attempts, successes, failures)
      VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(date, level) DO UPDATE SET
        attempts = attempts + 1,
        successes = successes + ?,
        failures = failures + ?
    `).bind(
      today, level,
      success ? 1 : 0, success ? 0 : 1,
      success ? 1 : 0, success ? 0 : 1
    ).run();

    return jsonResponse({ success: true }, 200, corsHeaders);
  } catch (error) {
    console.error('Attempt error:', error);
    return jsonResponse({ error: 'Failed to record attempt' }, 500, corsHeaders);
  }
}

/**
 * Get analytics data
 */
async function getAnalytics(request, env, corsHeaders) {
  try {
    // Get per-level stats (all time)
    const levelStats = await env.DB.prepare(`
      SELECT
        level,
        COUNT(*) as total_attempts,
        SUM(success) as successes,
        COUNT(*) - SUM(success) as failures,
        ROUND(100.0 * SUM(success) / COUNT(*), 1) as success_rate,
        ROUND(AVG(time_spent)) as avg_time
      FROM level_attempts
      GROUP BY level
      ORDER BY level
    `).all();

    // Get recent daily stats (last 7 days)
    const dailyStats = await env.DB.prepare(`
      SELECT date, level, attempts, successes, failures
      FROM daily_stats
      WHERE date >= date('now', '-7 days')
      ORDER BY date DESC, level ASC
    `).all();

    // Get overall stats
    const overallStats = await env.DB.prepare(`
      SELECT
        COUNT(DISTINCT session_id) as total_sessions,
        COUNT(*) as total_attempts,
        SUM(success) as total_successes
      FROM level_attempts
    `).first();

    // Get completion rate (sessions that reached max level)
    const completionStats = await env.DB.prepare(`
      SELECT
        COUNT(*) as total_sessions,
        SUM(CASE WHEN max_level_reached >= ? THEN 1 ELSE 0 END) as completions
      FROM game_sessions
    `).bind(CONFIG.MAX_LEVELS).first();

    return jsonResponse({
      levelStats: levelStats.results || [],
      dailyStats: dailyStats.results || [],
      overall: {
        totalSessions: overallStats?.total_sessions || 0,
        totalAttempts: overallStats?.total_attempts || 0,
        totalSuccesses: overallStats?.total_successes || 0,
        completionRate: completionStats?.total_sessions > 0
          ? ((completionStats.completions / completionStats.total_sessions) * 100).toFixed(1)
          : 0
      }
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Analytics error:', error);
    return jsonResponse({ error: 'Failed to fetch analytics' }, 500, corsHeaders);
  }
}

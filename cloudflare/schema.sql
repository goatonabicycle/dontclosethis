-- Database schema for Don't Close This high scores
-- Copy and paste these statements one at a time into the Cloudflare D1 Console

-- Main high scores table
CREATE TABLE IF NOT EXISTS high_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK(level >= 1 AND level <= 20),
  time_elapsed INTEGER NOT NULL CHECK(time_elapsed >= 0),
  timestamp INTEGER NOT NULL,
  ip_hash TEXT,
  session_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast leaderboard queries (level DESC, time ASC)
CREATE INDEX IF NOT EXISTS idx_level_time
ON high_scores(level DESC, time_elapsed ASC);

-- Index for player-specific queries
CREATE INDEX IF NOT EXISTS idx_player
ON high_scores(player_name);

-- Index for time-based queries (recent scores, etc.)
CREATE INDEX IF NOT EXISTS idx_timestamp
ON high_scores(timestamp DESC);

-- Index for checking duplicate submissions
CREATE INDEX IF NOT EXISTS idx_session_timestamp
ON high_scores(session_id, timestamp);

-- ============================================
-- ANALYTICS TABLES
-- ============================================

-- Track every level attempt (success or failure)
CREATE TABLE IF NOT EXISTS level_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  success INTEGER NOT NULL CHECK(success IN (0, 1)),
  time_spent INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  ip_hash TEXT
);

-- Index for level analytics
CREATE INDEX IF NOT EXISTS idx_level_attempts_level
ON level_attempts(level);

-- Index for session tracking
CREATE INDEX IF NOT EXISTS idx_level_attempts_session
ON level_attempts(session_id);

-- Aggregated daily stats (updated by worker)
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  level INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  avg_time_spent INTEGER DEFAULT 0,
  UNIQUE(date, level)
);

-- Index for date queries
CREATE INDEX IF NOT EXISTS idx_daily_stats_date
ON daily_stats(date DESC);

-- Game sessions
CREATE TABLE IF NOT EXISTS game_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  max_level_reached INTEGER DEFAULT 1,
  completed INTEGER DEFAULT 0 CHECK(completed IN (0, 1)),
  ip_hash TEXT
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_game_sessions_id
ON game_sessions(session_id);

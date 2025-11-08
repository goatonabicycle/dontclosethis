-- Database schema for Don't Close This high scores
-- Copy and paste these statements one at a time into the Cloudflare D1 Console

-- Main high scores table
CREATE TABLE IF NOT EXISTS high_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK(level >= 1 AND level <= 13),
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

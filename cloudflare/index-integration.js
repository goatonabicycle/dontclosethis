// Integration code for index.js - Global High Scores
// Add these changes to your existing index.js file

/**
 * STEP 1: Add the api-client.js script to index.html
 * Add this line to the <head> section:
 * <script src="api-client.js" defer></script>
 */

/**
 * STEP 2: Replace your existing loadHighScores() function with this version
 */
async function loadHighScores() {
  const scoresBody = document.getElementById("scores-body");

  if (!scoresBody) {
    console.error("scores-body element not found");
    return;
  }

  // Show loading state
  scoresBody.innerHTML = '<tr><td colspan="3" class="no-scores">⏳ Loading global scores...</td></tr>';

  // Get player name to highlight their score
  const playerName = storage.get(STORAGE_KEYS.PLAYER_INITIALS);

  try {
    // Fetch from API
    const data = await fetchScoresFromAPI(HIGH_SCORE_CONFIG.MAX_DISPLAY, playerName);

    if (!data || !data.globalTop || data.globalTop.length === 0) {
      // Fall back to local scores if API fails
      console.log("API unavailable, loading local scores");
      loadLocalHighScores();
      return;
    }

    // Render global scores
    scoresBody.innerHTML = data.globalTop
      .map((score) => {
        const isCurrentPlayer = playerName && score.playerName === playerName.toUpperCase();
        const rowClass = isCurrentPlayer ? ' class="highlight-player"' : '';

        return `
          <tr${rowClass}>
            <td class="score-rank">${score.rank}</td>
            <td>${sanitizeHTML(score.playerName)}</td>
            <td>Level ${score.level} in ${score.timeElapsed}s</td>
          </tr>
        `;
      })
      .join("");

    // Show stats if available
    if (data.stats) {
      console.log(
        `📊 Stats: ${data.stats.totalPlayers} players, ${data.stats.totalScores} total scores`
      );
    }

    // Show player rank if they're not in top 10
    if (data.playerRank && data.playerRank.rank > HIGH_SCORE_CONFIG.MAX_DISPLAY) {
      const playerRow = document.createElement("tr");
      playerRow.className = "player-rank-separator";
      playerRow.innerHTML = `
        <td colspan="3" style="padding: 10px; text-align: center; font-size: 0.9em; color: #666;">
          Your rank: #${data.playerRank.rank} (Level ${data.playerRank.level} in ${data.playerRank.timeElapsed}s)
        </td>
      `;
      scoresBody.appendChild(playerRow);
    }
  } catch (error) {
    console.error("Error loading global scores:", error);
    loadLocalHighScores();
  }
}

/**
 * STEP 3: Keep your existing loadLocalHighScores() as a fallback
 * Just rename your current loadHighScores() to loadLocalHighScores()
 */
function loadLocalHighScores() {
  const scores = storage.getJSON(STORAGE_KEYS.HIGH_SCORES, []);
  const scoresBody = document.getElementById("scores-body");

  if (!scoresBody) {
    console.error("scores-body element not found");
    return;
  }

  if (!Array.isArray(scores) || scores.length === 0) {
    scoresBody.innerHTML =
      '<tr><td colspan="3" class="no-scores">No local scores yet</td></tr>';
    return;
  }

  const bestScores = {};
  for (const score of scores) {
    if (!score || typeof score.initials !== "string") continue;

    const player = score.initials;
    if (!bestScores[player] || isScoreBetter(score, bestScores[player])) {
      bestScores[player] = score;
    }
  }

  const uniqueScores = Object.values(bestScores);
  uniqueScores.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return (a.timeElapsed || 999999) - (b.timeElapsed || 999999);
  });

  const topScores = uniqueScores.slice(0, HIGH_SCORE_CONFIG.MAX_DISPLAY);

  scoresBody.innerHTML = topScores
    .map(
      (score, index) => `
        <tr>
          <td class="score-rank">${index + 1}</td>
          <td>${sanitizeHTML(score.initials)}</td>
          <td>Reach level ${score.level} in ${score.timeElapsed || "?"}s</td>
        </tr>
      `
    )
    .join("");

  // Show offline indicator
  const offlineNote = document.createElement("tr");
  offlineNote.innerHTML = `
    <td colspan="3" style="padding: 10px; text-align: center; font-size: 0.85em; color: #888;">
      📡 Offline - Showing local scores only
    </td>
  `;
  scoresBody.appendChild(offlineNote);
}

/**
 * STEP 4: Optional - Add CSS for highlighting current player
 * Add this to your styles.css:
 *
 * .highlight-player {
 *   background-color: #ffffcc !important;
 *   font-weight: bold;
 * }
 *
 * .score-table tr:hover {
 *   background-color: #f5f5f5;
 * }
 */

/**
 * STEP 5: Optional - Check API health on page load
 * Add this to your DOMContentLoaded event:
 */
document.addEventListener("DOMContentLoaded", () => {
  // Your existing initialization code...

  // Check API health (optional)
  checkAPIHealth().then((isHealthy) => {
    if (isHealthy) {
      console.log("✅ API is online - global scores enabled");
    } else {
      console.log("⚠️ API is offline - using local scores only");
    }
  });

  // Rest of your existing code...
  loadHighScores();
});

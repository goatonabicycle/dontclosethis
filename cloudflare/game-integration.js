// Integration code for game.js - Submit scores to global API
// Add these changes to your existing game.js file

/**
 * STEP 1: Add the api-client.js script to game.html
 * Add this line to the <head> section:
 * <script src="api-client.js" defer></script>
 */

/**
 * STEP 2: Update your saveHighScore() function
 * Replace your existing saveHighScore() function with this version:
 */
function saveHighScore() {
  const initials =
    storage.get(GAME_CONFIG.INITIALS_KEY) || GAME_CONFIG.DEFAULT_INITIALS;
  const level = gameState.currentLevel - 1; // Level reached (not current)
  const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);

  // Save to localStorage first (always works as backup)
  const scores = storage.getJSON(STORAGE_KEYS.HIGH_SCORES, []);
  scores.push({
    initials: initials,
    level: level,
    timeElapsed: timeElapsed,
    timestamp: Date.now(),
  });
  storage.setJSON(STORAGE_KEYS.HIGH_SCORES, scores);

  // Try to submit to global API (async, non-blocking)
  submitScoreToAPI(initials, level, timeElapsed)
    .then((result) => {
      if (result.success) {
        console.log(
          `🎉 Score submitted! Your rank: #${result.rank}`
        );

        // Store rank info for victory message
        storage.set("lastGlobalRank", result.rank.toString());

        if (result.isTopTen) {
          console.log("🏆 You made the TOP 10!");
          storage.set("isTopTen", "true");
        }
      } else if (result.offline) {
        console.log("📡 API offline - score saved locally only");
      } else {
        console.warn("⚠️ Failed to submit score:", result.error);
      }
    })
    .catch((error) => {
      console.error("Error submitting score:", error);
    });
}

/**
 * STEP 3: Optional - Show rank in victory message
 * Update your victory screen code to show the player's rank
 */

// Add this to your victory() function or in index.js victory message handling:
function showVictoryMessage() {
  const victoryMsg = document.getElementById("victory-message");
  const victoryTimeSpan = document.getElementById("victory-time");
  const victoryLevelsSpan = document.getElementById("victory-levels");

  if (!victoryMsg) return;

  const victoryTime = storage.get("victoryTime");
  const totalLevels = storage.get("totalLevels") || "13";
  const globalRank = storage.get("lastGlobalRank");
  const isTopTen = storage.get("isTopTen") === "true";

  if (victoryTimeSpan) {
    victoryTimeSpan.textContent = victoryTime || "?";
  }

  if (victoryLevelsSpan) {
    victoryLevelsSpan.textContent = totalLevels;
  }

  // Add rank info if available
  if (globalRank) {
    let rankMessage = "";
    if (isTopTen) {
      rankMessage = ` You ranked #${globalRank} globally! 🏆`;
    } else {
      rankMessage = ` Your global rank: #${globalRank}`;
    }

    // Append rank to victory message
    const currentMessage = victoryMsg.innerHTML;
    victoryMsg.innerHTML = currentMessage + `<div style="font-size: 0.9em; margin-top: 10px;">${rankMessage}</div>`;
  }

  victoryMsg.style.display = "block";

  // Clean up stored rank data
  setTimeout(() => {
    storage.set("lastGlobalRank", "");
    storage.set("isTopTen", "false");
  }, 5000);
}

/**
 * STEP 4: Optional - Show API status in debug panel
 * If you have a debug panel, you can show API status:
 */
function updateDebugInfo() {
  const debugPanel = document.getElementById("debug-info");
  if (!debugPanel) return;

  const apiStatus = getAPIStatus();
  const statusText = apiStatus.available ? "🟢 Online" : "🔴 Offline";

  debugPanel.innerHTML = `
    API Status: ${statusText}<br>
    Last Check: ${new Date(apiStatus.lastCheck).toLocaleTimeString()}
  `;
}

/**
 * STEP 5: Optional - Retry failed submissions
 * If a player was offline when they won, retry submission when they come back online
 */
async function retryFailedSubmissions() {
  const pendingSubmissions = storage.getJSON("pendingSubmissions", []);

  if (pendingSubmissions.length === 0) {
    return;
  }

  console.log(`📤 Retrying ${pendingSubmissions.length} failed submissions...`);

  const stillPending = [];

  for (const submission of pendingSubmissions) {
    const result = await submitScoreToAPI(
      submission.playerName,
      submission.level,
      submission.timeElapsed
    );

    if (!result.success) {
      stillPending.push(submission);
    }
  }

  storage.setJSON("pendingSubmissions", stillPending);

  if (stillPending.length === 0) {
    console.log("✅ All pending submissions sent!");
  }
}

// Call this when the game loads or when the user returns online
window.addEventListener("online", () => {
  console.log("🌐 Connection restored");
  retryFailedSubmissions();
});

/**
 * STEP 6: Enhanced saveHighScore with offline queue
 * This version saves failed submissions for retry
 */
function saveHighScoreWithQueue() {
  const initials =
    storage.get(GAME_CONFIG.INITIALS_KEY) || GAME_CONFIG.DEFAULT_INITIALS;
  const level = gameState.currentLevel - 1;
  const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);

  // Save to localStorage first
  const scores = storage.getJSON(STORAGE_KEYS.HIGH_SCORES, []);
  scores.push({
    initials: initials,
    level: level,
    timeElapsed: timeElapsed,
    timestamp: Date.now(),
  });
  storage.setJSON(STORAGE_KEYS.HIGH_SCORES, scores);

  // Try to submit to global API
  submitScoreToAPI(initials, level, timeElapsed)
    .then((result) => {
      if (result.success) {
        console.log(`🎉 Score submitted! Rank: #${result.rank}`);
        storage.set("lastGlobalRank", result.rank.toString());
        if (result.isTopTen) {
          storage.set("isTopTen", "true");
        }
      } else if (result.offline) {
        // Queue for retry
        const pending = storage.getJSON("pendingSubmissions", []);
        pending.push({
          playerName: initials,
          level: level,
          timeElapsed: timeElapsed,
          timestamp: Date.now(),
        });
        storage.setJSON("pendingSubmissions", pending);
        console.log("📡 Queued for retry when online");
      }
    })
    .catch((error) => {
      console.error("Error submitting score:", error);
      // Queue for retry
      const pending = storage.getJSON("pendingSubmissions", []);
      pending.push({
        playerName: initials,
        level: level,
        timeElapsed: timeElapsed,
        timestamp: Date.now(),
      });
      storage.setJSON("pendingSubmissions", pending);
    });
}

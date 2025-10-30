// Don't Close This - Landing Page

const STORAGE_KEYS = {
  PLAYER_INITIALS: "playerInitials",
  HIGH_SCORES: "highScores",
};

const HIGH_SCORE_CONFIG = {
  MAX_DISPLAY: 10,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 10,
};

// Safe localStorage wrapper with error handling
const storage = {
  get(key) {
    try {
      if (typeof localStorage === "undefined") {
        console.warn("localStorage not available");
        return null;
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return null;
    }
  },

  set(key, value) {
    try {
      if (typeof localStorage === "undefined") {
        console.warn("localStorage not available");
        return false;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error("Error writing to localStorage:", error);
      return false;
    }
  },

  getJSON(key, defaultValue = null) {
    const data = this.get(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error("Error parsing JSON from localStorage:", error);
      return defaultValue;
    }
  },

  setJSON(key, value) {
    try {
      return this.set(key, JSON.stringify(value));
    } catch (error) {
      console.error("Error stringifying JSON for localStorage:", error);
      return false;
    }
  },
};

function sanitizeHTML(str) {
  const temp = document.createElement("div");
  temp.textContent = str;
  return temp.innerHTML;
}

function validateInitials(initials) {
  if (!initials || typeof initials !== "string") {
    return { valid: false, error: "Please enter your name" };
  }

  const trimmed = initials.trim();

  if (trimmed.length < HIGH_SCORE_CONFIG.MIN_NAME_LENGTH) {
    return { valid: false, error: "Please enter your name" };
  }

  if (trimmed.length > HIGH_SCORE_CONFIG.MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Name must be ${HIGH_SCORE_CONFIG.MAX_NAME_LENGTH} characters or less`,
    };
  }

  return { valid: true, value: trimmed.toUpperCase() };
}

function isScoreBetter(newScore, oldScore) {
  if (newScore.level > oldScore.level) return true;
  if (newScore.level < oldScore.level) return false;
  const newTime = newScore.timeElapsed || 999999;
  const oldTime = oldScore.timeElapsed || 999999;
  return newTime < oldTime;
}

function loadHighScores() {
  const scores = storage.getJSON(STORAGE_KEYS.HIGH_SCORES, []);
  const scoresBody = document.getElementById("scores-body");

  if (!scoresBody) {
    console.error("scores-body element not found");
    return;
  }

  if (!Array.isArray(scores) || scores.length === 0) {
    scoresBody.innerHTML =
      '<tr><td colspan="3" class="no-scores">No scores yet</td></tr>';
    return;
  }

  const bestScores = {};
  scores.forEach((score) => {
    if (!score || typeof score.initials !== "string") return;

    const player = score.initials;
    if (!bestScores[player] || isScoreBetter(score, bestScores[player])) {
      bestScores[player] = score;
    }
  });

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
      `,
    )
    .join("");
}

function startGame() {
  const initialsInput = document.getElementById("initials");
  if (!initialsInput) {
    console.error("Initials input not found");
    return;
  }

  const validation = validateInitials(initialsInput.value);

  if (!validation.valid) {
    alert(validation.error);
    initialsInput.focus();
    return;
  }

  storage.set(STORAGE_KEYS.PLAYER_INITIALS, validation.value);
  window.open("game.html", "_blank");
}

function handleInputChange(event) {
  const input = event.target;
  input.value = input.value.toUpperCase();
}

function handleKeyPress(event) {
  if (event.key === "Enter") {
    startGame();
  }
}

function checkGameMessages() {
  const justDied = storage.get("justDied");
  if (justDied === "true") {
    const gameOverMsg = document.getElementById("game-over-message");
    if (gameOverMsg) {
      gameOverMsg.style.display = "block";
      setTimeout(() => {
        gameOverMsg.style.display = "none";
      }, 3000);
    }
    storage.set("justDied", "false");
  }

  const hasWon = storage.get("hasWon");
  if (hasWon === "true") {
    const victoryMsg = document.getElementById("victory-message");
    const victoryTimeSpan = document.getElementById("victory-time");
    const victoryTime = storage.get("victoryTime");

    if (victoryMsg && victoryTimeSpan) {
      victoryTimeSpan.textContent = victoryTime || "?";
      victoryMsg.style.display = "block";
      setTimeout(() => {
        victoryMsg.style.display = "none";
      }, 5000);
    }
    storage.set("hasWon", "false");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const initialsInput = document.getElementById("initials");
  const startBtn = document.getElementById("start-btn");

  if (!initialsInput || !startBtn) {
    console.error("Required elements not found");
    return;
  }

  checkGameMessages();

  const savedInitials = storage.get(STORAGE_KEYS.PLAYER_INITIALS);
  if (savedInitials) {
    initialsInput.value = savedInitials;
  }

  initialsInput.focus();

  initialsInput.addEventListener("input", handleInputChange);
  initialsInput.addEventListener("keypress", handleKeyPress);
  startBtn.addEventListener("click", startGame);

  loadHighScores();
  window.addEventListener("focus", () => {
    loadHighScores();
    checkGameMessages();
  });
});

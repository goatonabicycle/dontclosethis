// Don't Close This - Game Logic

const GAME_CONFIG = {
  STORAGE_KEY: "dontCloseThis",
  PLAYER_KEY: "playerInitials",
  SCORES_KEY: "highScores",
  DEFAULT_INITIALS: "AAA",
};

// API Configuration
const API_CONFIG = {
  BASE_URL: "https://dontclosethis-api.YOUR_SUBDOMAIN.workers.dev", // Update this!
  ENABLED: false, // Set to true when API is deployed
};

// Analytics tracking
const analytics = {
  sessionId: null,
  levelStartTime: null,

  async init() {
    if (!API_CONFIG.ENABLED) return;

    // Generate or retrieve session ID
    this.sessionId = sessionStorage.getItem("gameSessionId");
    if (!this.sessionId) {
      this.sessionId = crypto.randomUUID();
      sessionStorage.setItem("gameSessionId", this.sessionId);
    }

    // Register session with server
    try {
      await fetch(`${API_CONFIG.BASE_URL}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: this.sessionId }),
      });
    } catch (e) {
      console.warn("Failed to init analytics session:", e);
    }
  },

  startLevel() {
    this.levelStartTime = Date.now();
  },

  async recordAttempt(level, success) {
    if (!API_CONFIG.ENABLED || !this.sessionId) return;

    const timeSpent = this.levelStartTime
      ? Math.floor((Date.now() - this.levelStartTime) / 1000)
      : 0;

    try {
      await fetch(`${API_CONFIG.BASE_URL}/api/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: this.sessionId,
          level,
          success,
          timeSpent,
        }),
      });
    } catch (e) {
      console.warn("Failed to record attempt:", e);
    }
  },

  async submitScore(playerName, level, timeElapsed) {
    if (!API_CONFIG.ENABLED) return null;

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/api/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
          level,
          timeElapsed,
          sessionId: this.sessionId,
        }),
      });
      return await response.json();
    } catch (e) {
      console.warn("Failed to submit score:", e);
      return null;
    }
  },
};

const LEVEL_CONFIG = {
  MANY_BUTTONS: {
    MIN_BUTTONS: 25,
    MAX_BUTTONS: 40,
    TIMER_DURATION: 3,
    BUTTON_COLORS: [
      "#ff4444",
      "#4444ff",
      "#ff69b4",
      "#00ff00",
      "#ffff00",
      "#8b00ff",
      "#00ffff",
      "#ff8800",
    ],
  },
  NUMBERED_BUTTONS: {
    BUTTON_COUNT: 10,
    MIN_POSITION: 1,
    MAX_POSITION: 10,
  },
  TRAFFIC_LIGHT: {
    MIN_CYCLE_SPEED: 500,
    MAX_CYCLE_SPEED: 1200,
    MIN_COLORS: 3,
    MAX_COLORS: 5,
    COLOR_POOL: [
      { name: "RED", hex: "#ff0000" },
      { name: "BLUE", hex: "#0000ff" },
      { name: "GREEN", hex: "#00ff00" },
      { name: "YELLOW", hex: "#ffff00" },
      { name: "PURPLE", hex: "#8b00ff" },
      { name: "ORANGE", hex: "#ff8800" },
      { name: "PINK", hex: "#ff69b4" },
      { name: "CYAN", hex: "#00ffff" },
    ],
  },
  MATH_QUIZ: {
    MIN_NUMBER: 10,
    MAX_NUMBER: 50,
    ANSWER_COUNT: 6,
    VARIATION: 8,
  },
  SEQUENCE: {
    LETTERS: ["A", "B", "C", "D", "E"],
  },
  CUP_MONTE: {
    SHOW_DURATION: 2500,
    SHUFFLE_COUNT: 10,
    SHUFFLE_SPEED: 800,
    LIFT_HEIGHT: 1.5,
    CUP_POSITIONS: [-2.5, 0, 2.5],
  },
  PATTERN_MEMORY: {
    PATTERN_LENGTH: 6,
    CHARACTERS: ["A", "B", "C", "D", "E", "F"],
    OPTION_COUNT: 8,
    DISPLAY_DURATION: 2500,
  },
  TRIPWIRE_MAZE: {
    PATH_WIDTH: 60,
    SEGMENTS: 6,
    CANVAS_WIDTH: 700,
    CANVAS_HEIGHT: 400,
  },
  PIPE_ROTATION: {
    GRID_SIZE: 10,
    CELL_SIZE: 50,
    PIPE_WIDTH: 14,
  },
  PRECISE_TIMING: {
    MIN_TARGET_START: 8,
    MAX_TARGET_START: 12,
    WINDOW_SIZE: 1,
    TIMER_HIDE_BEFORE: 5,
  },
  DOG_BREED: {
    ANSWER_COUNT: 6,
    API_URL: "https://dog.ceo/api/breeds/image/random",
    ALL_BREEDS_URL: "https://dog.ceo/api/breeds/list/all",
  },
};

const gameState = {
  currentLevel: 1,
  totalAttempts: 0,
  activeIntervals: [],
  persistentIntervals: [],
  cachedElements: {},
  startTime: Date.now(),
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

function getElement(id) {
  if (!gameState.cachedElements[id]) {
    gameState.cachedElements[id] = document.getElementById(id);
  }
  return gameState.cachedElements[id];
}

function registerInterval(intervalId) {
  gameState.activeIntervals.push(intervalId);
}

function registerPersistentInterval(intervalId) {
  gameState.persistentIntervals.push(intervalId);
}

function clearAllIntervals() {
  for (const id of gameState.activeIntervals) {
    clearInterval(id);
  }
  gameState.activeIntervals = [];
}

function createButton(text, onClick, styles = {}) {
  const btn = document.createElement("button");
  btn.textContent = text;
  btn.onclick = onClick;
  Object.assign(btn.style, styles);
  return btn;
}

// Fisher-Yates shuffle
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function loadProgress() {
  const saved = storage.getJSON(GAME_CONFIG.STORAGE_KEY);
  if (saved && typeof saved.attempts === "number") {
    gameState.totalAttempts = saved.attempts;
  }
}

function saveProgress() {
  const saved = storage.getJSON(GAME_CONFIG.STORAGE_KEY, {});
  storage.setJSON(GAME_CONFIG.STORAGE_KEY, {
    attempts: gameState.totalAttempts,
    highestLevel: Math.max(gameState.currentLevel, saved.highestLevel || 0),
  });
}

function saveHighScore() {
  const initials =
    storage.get(GAME_CONFIG.PLAYER_KEY) || GAME_CONFIG.DEFAULT_INITIALS;
  const scores = storage.getJSON(GAME_CONFIG.SCORES_KEY, []);
  const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);

  scores.push({
    initials: initials,
    level: Math.min(gameState.currentLevel, levels.length),
    attempts: gameState.totalAttempts,
    timeElapsed: timeElapsed,
    timestamp: Date.now(),
  });

  storage.setJSON(GAME_CONFIG.SCORES_KEY, scores);
}

const game = {
  nextLevel: () => {
    clearAllIntervals();

    // Record successful attempt
    analytics.recordAttempt(gameState.currentLevel, true);

    gameState.currentLevel++;
    if (gameState.currentLevel > levels.length) {
      game.victory();
      return;
    }
    renderLevel();
  },

  die: () => {
    clearAllIntervals();

    // Record failed attempt
    analytics.recordAttempt(gameState.currentLevel, false);

    gameState.totalAttempts++;
    saveProgress();
    saveHighScore();

    storage.set("justDied", "true");

    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      window.location.href = "index.html";
    }
  },

  victory: async () => {
    clearAllIntervals();
    gameState.totalAttempts++;
    saveProgress();
    saveHighScore();

    const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);

    // Submit score to global leaderboard
    const playerName = storage.get(GAME_CONFIG.PLAYER_KEY) || GAME_CONFIG.DEFAULT_INITIALS;
    const result = await analytics.submitScore(playerName, levels.length, timeElapsed);
    if (result?.isTopTen) {
      storage.set("madeTopTen", "true");
    }

    storage.set("hasWon", "true");
    storage.set("victoryTime", timeElapsed.toString());
    storage.set("totalLevels", levels.length.toString());

    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      window.location.href = "index.html";
    }
  },

  getContainer: () => getElement("game-container"),
  getQuestionElement: () => getElement("question"),
  getButtonsElement: () => getElement("buttons"),
};

const levels = [
  // Level 0: Introduction
  {
    render: () => {
      game.getQuestionElement().innerHTML =
        "This tab wants to close.<br><br>Don't let it.<br><br><span style='font-size: 0.85rem; opacity: 0.7;'>Fail a challenge and your tab closes. If your tab closes, you lose.</span>";

      const container = game.getButtonsElement();
      const beginBtn = createButton("BEGIN", game.nextLevel);
      container.appendChild(beginBtn);
    },
  },

  // Level 1: Pong - Survive 10 Hits
  {
    render: () => {
      game.getQuestionElement().innerHTML =
        "Survive 10 hits or your tab closes!<br><span style='font-size: 0.75rem; opacity: 0.7;'>Move your mouse to control the paddle</span>";

      const container = game.getButtonsElement();
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.gap = "20px";

      // Game state
      let hits = 0;
      let gameRunning = false;
      let animationId = null;

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = 500;
      canvas.height = 400;
      canvas.style.border = "3px solid #000";
      canvas.style.background = "#000";
      const ctx = canvas.getContext("2d");

      // Game objects
      const paddle = {
        x: canvas.width / 2 - 50,
        y: canvas.height - 30,
        width: 100,
        height: 15,
        speed: 0,
      };

      const ball = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 8,
        dx: 4,
        dy: -4,
        speed: 4,
      };

      // Score display
      const scoreDiv = document.createElement("div");
      scoreDiv.style.fontSize = "1.5rem";
      scoreDiv.style.fontWeight = "bold";
      scoreDiv.style.color = "#000";
      scoreDiv.textContent = `Hits: ${hits}/10`;

      // Mouse control
      canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddle.x = mouseX - paddle.width / 2;

        // Keep paddle in bounds
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width)
          paddle.x = canvas.width - paddle.width;
      });

      function drawPaddle() {
        ctx.fillStyle = "#fff";
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
      }

      function drawBall() {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      function drawScore() {
        ctx.fillStyle = "#fff";
        ctx.font = "20px 'Courier New', monospace";
        ctx.textAlign = "right";
        ctx.fillText(`${hits}/10`, canvas.width - 20, 30);
      }

      function updateBall() {
        ball.x += ball.dx;
        ball.y += ball.dy;

        // Wall collision (left/right)
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
          ball.dx = -ball.dx;
        }

        // Top wall collision
        if (ball.y - ball.radius < 0) {
          ball.dy = -ball.dy;
        }

        // Paddle collision
        if (
          ball.y + ball.radius >= paddle.y &&
          ball.y - ball.radius <= paddle.y + paddle.height &&
          ball.x >= paddle.x &&
          ball.x <= paddle.x + paddle.width
        ) {
          // Hit the paddle!
          ball.dy = -Math.abs(ball.dy);
          hits++;
          scoreDiv.textContent = `Hits: ${hits}/10`;

          // Add some horizontal variation based on where the ball hits the paddle
          const hitPos = (ball.x - paddle.x) / paddle.width; // 0 to 1
          ball.dx = (hitPos - 0.5) * 8; // -4 to 4

          // Increase speed slightly every 3 hits
          if (hits % 3 === 0) {
            ball.dx *= 1.1;
            ball.dy *= 1.1;
          }

          // Check win condition
          if (hits >= 10) {
            gameRunning = false;
            cancelAnimationFrame(animationId);
            setTimeout(() => {
              game.nextLevel();
            }, 500);
          }
        }

        // Ball missed (bottom)
        if (ball.y - ball.radius > canvas.height) {
          gameRunning = false;
          cancelAnimationFrame(animationId);
          game.die();
        }
      }

      function gameLoop() {
        if (!gameRunning) return;

        // Clear canvas
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawPaddle();
        drawBall();
        drawScore();
        updateBall();

        animationId = requestAnimationFrame(gameLoop);
      }

      // Start button
      const startBtn = createButton("START", () => {
        startBtn.remove();
        canvas.style.cursor = "none";
        gameRunning = true;
        gameLoop();
      });

      container.appendChild(scoreDiv);
      container.appendChild(canvas);
      container.appendChild(startBtn);

      // Cleanup on level change
      return () => {
        gameRunning = false;
        if (animationId) cancelAnimationFrame(animationId);
      };
    },
  },

  // Level 2: Frogs and Toads Puzzle
  {
    render: () => {
      game.getQuestionElement().innerHTML =
        "Swap the frogs and toads or your tab closes!<br><span style='font-size: 0.75rem; opacity: 0.7;'>Click to move forward or jump over one opponent</span>";

      // Make game container wider for this level
      game.getContainer().style.maxWidth = "800px";

      const container = game.getButtonsElement();
      container.style.display = "flex";
      container.style.flexDirection = "column";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.gap = "5px";
      container.style.padding = "5px";

      const numPieces = 3;
      const totalSlots = numPieces * 2 + 1; // 3 frogs + 1 empty + 3 toads = 7 slots

      // Initial state: [F, F, F, _, T, T, T]
      // Goal state: [T, T, T, _, F, F, F]
      const state = [];
      for (let i = 0; i < numPieces; i++) state.push("F"); // Frogs on left
      state.push("_"); // Empty space in middle
      for (let i = 0; i < numPieces; i++) state.push("T"); // Toads on right

      const emptyIndex = () => state.indexOf("_");

      function isValidMove(index) {
        const empty = emptyIndex();
        const piece = state[index];

        if (piece === "_") return false;

        // Frogs (F) can only move right, Toads (T) can only move left
        if (piece === "F") {
          // Can move right into empty space
          if (index + 1 === empty) return true;
          // Can jump right over one toad into empty space
          if (index + 2 === empty && state[index + 1] === "T") return true;
        } else if (piece === "T") {
          // Can move left into empty space
          if (index - 1 === empty) return true;
          // Can jump left over one frog into empty space
          if (index - 2 === empty && state[index - 1] === "F") return true;
        }

        return false;
      }

      function movePiece(index) {
        if (!isValidMove(index)) return;

        const empty = emptyIndex();

        // Add bounce animation to the moving piece
        const movingBtn = buttons[index];
        movingBtn.style.transform = "scale(1.15) translateY(-5px)";

        setTimeout(() => {
          // Swap piece with empty space
          [state[index], state[empty]] = [state[empty], state[index]];
          updateDisplay();
          checkWin();
        }, 150);
      }

      function checkWin() {
        // Goal: [T, T, T, _, F, F, F]
        let correct = true;
        for (let i = 0; i < numPieces; i++) {
          if (state[i] !== "T") correct = false;
        }
        if (state[numPieces] !== "_") correct = false;
        for (let i = numPieces + 1; i < totalSlots; i++) {
          if (state[i] !== "F") correct = false;
        }

        if (correct) {
          game.getQuestionElement().textContent =
            "Perfect! They've all switched places! 🎉";
          buttons.forEach((btn) => {
            btn.disabled = true;
            btn.style.opacity = "0.6";
          });
          setTimeout(() => {
            game.nextLevel();
          }, 1500);
        }
      }

      function updateDisplay() {
        buttons.forEach((btn, index) => {
          const piece = state[index];
          const isValid = isValidMove(index);

          if (piece === "F") {
            btn.textContent = "🐸";
            btn.style.background = isValid
              ? "linear-gradient(135deg, #81C784 0%, #66BB6A 100%)"
              : "linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)";
            btn.style.boxShadow = isValid
              ? "0 6px 20px rgba(76, 175, 80, 0.5), 0 0 0 3px rgba(76, 175, 80, 0.2)"
              : "0 2px 8px rgba(0, 0, 0, 0.2)";
            btn.style.cursor = isValid ? "pointer" : "not-allowed";
            btn.style.transform = isValid ? "scale(1)" : "scale(0.92)";
            btn.style.opacity = isValid ? "1" : "0.5";
            btn.style.filter = isValid ? "brightness(1.1)" : "brightness(0.8)";
          } else if (piece === "T") {
            btn.textContent = "🐢";
            btn.style.background = isValid
              ? "linear-gradient(135deg, #FFB74D 0%, #FFA726 100%)"
              : "linear-gradient(135deg, #FFA726 0%, #FF9800 100%)";
            btn.style.boxShadow = isValid
              ? "0 6px 20px rgba(255, 152, 0, 0.5), 0 0 0 3px rgba(255, 152, 0, 0.2)"
              : "0 2px 8px rgba(0, 0, 0, 0.2)";
            btn.style.cursor = isValid ? "pointer" : "not-allowed";
            btn.style.transform = isValid ? "scale(1)" : "scale(0.92)";
            btn.style.opacity = isValid ? "1" : "0.5";
            btn.style.filter = isValid ? "brightness(1.1)" : "brightness(0.8)";
          } else {
            btn.textContent = "";
            btn.style.background = "#f5f5f5";
            btn.style.boxShadow = "inset 0 2px 8px rgba(0, 0, 0, 0.15)";
            btn.style.cursor = "default";
            btn.style.transform = "scale(1)";
            btn.style.opacity = "1";
            btn.style.filter = "none";
          }
        });
      }

      // Create board container with visual platform
      const boardWrapper = document.createElement("div");
      boardWrapper.style.position = "relative";
      boardWrapper.style.padding = "10px";
      boardWrapper.style.background =
        "linear-gradient(to bottom, #8B7355 0%, #6F5B4A 100%)";
      boardWrapper.style.borderRadius = "12px";
      boardWrapper.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.3)";

      const slotsContainer = document.createElement("div");
      slotsContainer.style.display = "flex";
      slotsContainer.style.gap = "6px";
      slotsContainer.style.justifyContent = "center";

      boardWrapper.appendChild(slotsContainer);
      container.appendChild(boardWrapper);

      // Create buttons for each slot
      const buttons = [];
      for (let i = 0; i < totalSlots; i++) {
        const btn = createButton("", () => movePiece(i), {
          width: "70px",
          height: "70px",
          fontSize: "42px",
          border: "3px solid #333",
          borderRadius: "8px",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        });

        btn.addEventListener("mouseenter", () => {
          if (isValidMove(i) && state[i] !== "_") {
            btn.style.transform = "scale(1.08) translateY(-2px)";
          }
        });

        btn.addEventListener("mouseleave", () => {
          if (state[i] !== "_") {
            btn.style.transform = isValidMove(i) ? "scale(1)" : "scale(0.95)";
          }
        });

        buttons.push(btn);
        slotsContainer.appendChild(btn);
      }

      updateDisplay();
    },
  },

  // Level 2: Lights Out Puzzle
  {
    render: () => {
      game.getQuestionElement().textContent =
        "Turn all lights OFF! Clicking a light toggles it and its neighbors.";

      const container = game.getButtonsElement();
      container.style.display = "grid";
      container.style.gridTemplateColumns = "repeat(4, 1fr)";
      container.style.gap = "10px";
      container.style.maxWidth = "400px";
      container.style.margin = "0 auto";
      container.style.padding = "20px";

      const gridSize = 4;
      const grid = [];

      // Initialize grid with random lights (but ensure it's solvable)
      for (let i = 0; i < gridSize * gridSize; i++) {
        grid[i] = false; // All off initially
      }

      // Apply random toggles to create a solvable puzzle
      // Use a set to avoid toggling the same cell twice
      const toggledCells = new Set();
      const numToggles = 5 + Math.floor(Math.random() * 4); // 5-8 unique toggles
      while (toggledCells.size < numToggles) {
        toggledCells.add(Math.floor(Math.random() * (gridSize * gridSize)));
      }

      for (const cellIndex of toggledCells) {
        toggleCell(cellIndex, false); // Don't update UI, just set state
      }

      function toggleCell(index, updateUI = true) {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;

        // Toggle the clicked cell
        grid[index] = !grid[index];

        // Toggle neighbors (up, down, left, right)
        // Up
        if (row > 0) {
          grid[index - gridSize] = !grid[index - gridSize];
        }
        // Down
        if (row < gridSize - 1) {
          grid[index + gridSize] = !grid[index + gridSize];
        }
        // Left
        if (col > 0) {
          grid[index - 1] = !grid[index - 1];
        }
        // Right
        if (col < gridSize - 1) {
          grid[index + 1] = !grid[index + 1];
        }

        if (updateUI) {
          updateAllButtons();
          checkWin();
        }
      }

      function updateAllButtons() {
        for (let i = 0; i < gridSize * gridSize; i++) {
          const btn = buttons[i];
          if (grid[i]) {
            btn.style.background = "#ffff00"; // Yellow when ON
            btn.style.boxShadow = "0 0 20px rgba(255, 255, 0, 0.8)";
          } else {
            btn.style.background = "#333"; // Dark when OFF
            btn.style.boxShadow = "none";
          }
        }
      }

      function checkWin() {
        const allOff = grid.every((light) => !light);
        if (allOff) {
          game.getQuestionElement().textContent = "All lights are OFF! Well done!";
          // Disable all buttons
          buttons.forEach((btn) => {
            btn.disabled = true;
            btn.style.opacity = "0.5";
          });
          setTimeout(() => {
            game.nextLevel();
          }, 1000);
        }
      }

      // Create buttons
      const buttons = [];
      for (let i = 0; i < gridSize * gridSize; i++) {
        const btn = createButton("", () => toggleCell(i), {
          width: "80px",
          height: "80px",
          fontSize: "24px",
          border: "2px solid #000",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        });
        buttons.push(btn);
        container.appendChild(btn);
      }

      // Initial render
      updateAllButtons();
    },
  },

  // Level 3: Pipe Rotation Puzzle
  {
    render: () => {
      const config = LEVEL_CONFIG.PIPE_ROTATION;

      game.getQuestionElement().textContent =
        "Rotate the pipes to connect the green start to the red end!";

      const container = game.getButtonsElement();
      container.style.textAlign = "center";
      container.style.padding = "20px";

      const canvas = document.createElement("canvas");
      const totalSize = config.GRID_SIZE * config.CELL_SIZE;
      canvas.width = totalSize;
      canvas.height = totalSize;
      canvas.style.border = "3px solid #000";
      canvas.style.background = "#fff";
      canvas.style.cursor = "pointer";
      canvas.style.display = "block";
      canvas.style.margin = "20px auto";

      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");

      const PIPE_STRAIGHT = 0;
      const PIPE_CORNER = 1;

      // Generate a random winding path from start to end
      function generateRandomPath() {
        const maxSize = config.GRID_SIZE - 1;
        const maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const path = [{ x: 0, y: 0 }];
          const visited = new Set(["0,0"]);
          let current = { x: 0, y: 0 };
          const target = { x: maxSize, y: maxSize };

          // Minimum path length should be at least 1.5x the Manhattan distance
          const minPathLength = Math.floor(maxSize * 2 * 1.5);

          while (current.x !== target.x || current.y !== target.y) {
            const possibleMoves = [];

            // Balanced weighting between progress and exploration
            // Allow more wandering if we're far from minimum path length
            const progressWeight = path.length < minPathLength ? 2 : 4;
            const exploreWeight = path.length < minPathLength ? 3 : 1;

            // Moves toward target
            if (current.x < target.x)
              possibleMoves.push({
                x: current.x + 1,
                y: current.y,
                weight: progressWeight,
              });
            if (current.x > target.x)
              possibleMoves.push({
                x: current.x - 1,
                y: current.y,
                weight: progressWeight,
              });
            if (current.y < target.y)
              possibleMoves.push({
                x: current.x,
                y: current.y + 1,
                weight: progressWeight,
              });
            if (current.y > target.y)
              possibleMoves.push({
                x: current.x,
                y: current.y - 1,
                weight: progressWeight,
              });

            // Moves away from target or perpendicular (for wandering)
            if (current.x > 0)
              possibleMoves.push({
                x: current.x - 1,
                y: current.y,
                weight: exploreWeight,
              });
            if (current.x < maxSize)
              possibleMoves.push({
                x: current.x + 1,
                y: current.y,
                weight: exploreWeight,
              });
            if (current.y > 0)
              possibleMoves.push({
                x: current.x,
                y: current.y - 1,
                weight: exploreWeight,
              });
            if (current.y < maxSize)
              possibleMoves.push({
                x: current.x,
                y: current.y + 1,
                weight: exploreWeight,
              });

            // Filter out visited cells
            const validMoves = possibleMoves.filter(
              (m) => !visited.has(`${m.x},${m.y}`),
            );

            if (validMoves.length === 0) break; // Dead end, try again

            // Weighted random selection
            const totalWeight = validMoves.reduce(
              (sum, m) => sum + m.weight,
              0,
            );
            let random = Math.random() * totalWeight;
            let next = validMoves[0];
            for (const move of validMoves) {
              random -= move.weight;
              if (random <= 0) {
                next = move;
                break;
              }
            }

            current = { x: next.x, y: next.y };
            path.push(current);
            visited.add(`${current.x},${current.y}`);
          }

          // If we reached target with a good path length, use it
          if (
            current.x === target.x &&
            current.y === target.y &&
            path.length >= minPathLength
          ) {
            return path;
          }
        }

        // Fallback: create a winding L-shaped path that traverses the map
        const fallbackPath = [];
        // Go right along the top
        for (let x = 0; x <= maxSize; x++) fallbackPath.push({ x, y: 0 });
        // Go down the right side
        for (let y = 1; y <= maxSize; y++) fallbackPath.push({ x: maxSize, y });
        return fallbackPath;
      }

      const solutionPath = generateRandomPath();

      // Initialize grid with ALL cells having pipes (decoys + solution)
      const grid = [];
      for (let y = 0; y < config.GRID_SIZE; y++) {
        grid[y] = [];
        for (let x = 0; x < config.GRID_SIZE; x++) {
          // Randomly assign type and rotation for decoy pipes
          grid[y][x] = {
            type: Math.random() < 0.6 ? PIPE_STRAIGHT : PIPE_CORNER,
            rotation: Math.floor(Math.random() * 4),
            inPath: false,
            correctRotation: 0,
          };
        }
      }

      // Dynamically set up the actual solution path based on generated path
      for (let i = 0; i < solutionPath.length; i++) {
        const pos = solutionPath[i];
        const cell = grid[pos.y][pos.x];
        cell.inPath = true;

        // Determine what directions this pipe needs to connect
        const prev = i > 0 ? solutionPath[i - 1] : null;
        const next = i < solutionPath.length - 1 ? solutionPath[i + 1] : null;

        // Calculate direction to previous cell (where we came from)
        let dirFromPrev = -1;
        if (prev) {
          if (prev.x === pos.x - 1)
            dirFromPrev = 3; // came from left
          else if (prev.x === pos.x + 1)
            dirFromPrev = 1; // came from right
          else if (prev.y === pos.y - 1)
            dirFromPrev = 0; // came from top
          else if (prev.y === pos.y + 1) dirFromPrev = 2; // came from bottom
        }

        // Calculate direction to next cell (where we're going)
        let dirToNext = -1;
        if (next) {
          if (next.x === pos.x + 1)
            dirToNext = 1; // going right
          else if (next.x === pos.x - 1)
            dirToNext = 3; // going left
          else if (next.y === pos.y + 1)
            dirToNext = 2; // going bottom
          else if (next.y === pos.y - 1) dirToNext = 0; // going top
        }

        // Determine pipe type and rotation
        if (dirFromPrev === -1 || dirToNext === -1) {
          // Start or end - use straight pipe in appropriate direction
          const dir = dirFromPrev !== -1 ? dirFromPrev : dirToNext;
          cell.type = PIPE_STRAIGHT;
          cell.correctRotation = dir === 0 || dir === 2 ? 0 : 1; // 0 for vertical, 1 for horizontal
        } else if (Math.abs(dirFromPrev - dirToNext) === 2) {
          // Opposite directions = straight pipe
          cell.type = PIPE_STRAIGHT;
          cell.correctRotation = dirFromPrev === 0 || dirFromPrev === 2 ? 0 : 1;
        } else {
          // Direction change = corner pipe
          cell.type = PIPE_CORNER;

          // Determine which sides the corner opens to
          const openings = [dirFromPrev, dirToNext].sort((a, b) => a - b);

          // Map opening pairs to rotation:
          // [0,1] = top-right = rotation 0
          // [1,2] = right-bottom = rotation 1
          // [2,3] = bottom-left = rotation 2
          // [0,3] = top-left = rotation 3
          if (openings[0] === 0 && openings[1] === 1) cell.correctRotation = 0;
          else if (openings[0] === 1 && openings[1] === 2)
            cell.correctRotation = 1;
          else if (openings[0] === 2 && openings[1] === 3)
            cell.correctRotation = 2;
          else if (openings[0] === 0 && openings[1] === 3)
            cell.correctRotation = 3;
        }
      }

      // Start all correct then scramble
      for (let i = 0; i < solutionPath.length; i++) {
        const pos = solutionPath[i];
        grid[pos.y][pos.x].rotation = grid[pos.y][pos.x].correctRotation;
      }

      // Scramble 10-12 random solution pipes
      const scrambleCount = Math.floor(Math.random() * 3) + 10; // 10-12 pipes
      const scrambled = new Set();
      while (scrambled.size < Math.min(scrambleCount, solutionPath.length)) {
        scrambled.add(Math.floor(Math.random() * solutionPath.length));
      }

      for (const idx of scrambled) {
        const pos = solutionPath[idx];
        const cell = grid[pos.y][pos.x];

        if (cell.type === PIPE_STRAIGHT) {
          // For straight pipes, rotate to perpendicular
          const correct = cell.correctRotation;
          if (correct === 0 || correct === 2) {
            cell.rotation = 1; // vertical -> horizontal
          } else {
            cell.rotation = 0; // horizontal -> vertical
          }
        } else {
          // For corner pipes, rotate 1, 2, or 3 positions
          const offset = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
          cell.rotation = (cell.correctRotation + offset) % 4;
        }
      }

      function drawPipe(
        x,
        y,
        type,
        rotation,
        highlight = false,
        isCorrect = false,
      ) {
        const centerX = x * config.CELL_SIZE + config.CELL_SIZE / 2;
        const centerY = y * config.CELL_SIZE + config.CELL_SIZE / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((rotation * Math.PI) / 2);

        // Color coding: make all pipes look similar, only show green when connected
        let strokeColor = "#666"; // All pipes same medium gray
        if (highlight) {
          strokeColor = "#00aaff"; // Bright blue when puzzle is solved
        } else if (isCorrect) {
          strokeColor = "#66cc66"; // Green for correctly connected solution pipes
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = config.PIPE_WIDTH;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        if (type === PIPE_STRAIGHT) {
          ctx.beginPath();
          ctx.moveTo(0, -config.CELL_SIZE / 2);
          ctx.lineTo(0, config.CELL_SIZE / 2);
          ctx.stroke();
        } else if (type === PIPE_CORNER) {
          ctx.beginPath();
          ctx.moveTo(0, -config.CELL_SIZE / 2);
          ctx.lineTo(0, 0);
          ctx.lineTo(config.CELL_SIZE / 2, 0);
          ctx.stroke();
        }

        ctx.restore();
      }

      function drawGrid(highlightPath = false) {
        ctx.fillStyle = "#f5f5f5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 1;
        for (let i = 0; i <= config.GRID_SIZE; i++) {
          ctx.beginPath();
          ctx.moveTo(i * config.CELL_SIZE, 0);
          ctx.lineTo(i * config.CELL_SIZE, totalSize);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, i * config.CELL_SIZE);
          ctx.lineTo(totalSize, i * config.CELL_SIZE);
          ctx.stroke();
        }

        // Highlight path cells if needed
        if (highlightPath) {
          ctx.fillStyle = "rgba(0, 255, 0, 0.1)";
          for (const pos of solutionPath) {
            ctx.fillRect(
              pos.x * config.CELL_SIZE,
              pos.y * config.CELL_SIZE,
              config.CELL_SIZE,
              config.CELL_SIZE,
            );
          }
        }

        // Draw ALL pipes (both decoy and solution)
        for (let y = 0; y < config.GRID_SIZE; y++) {
          for (let x = 0; x < config.GRID_SIZE; x++) {
            const cell = grid[y][x];

            if (cell.inPath) {
              // This is part of the solution path - check if it's correctly connected
              let isCorrect = false;

              // Find this cell's position in the solution path
              const pathIndex = solutionPath.findIndex(
                (p) => p.x === x && p.y === y,
              );

              if (pathIndex !== -1) {
                let connectedToPrev = true;
                let connectedToNext = true;

                // Check connection to previous pipe
                if (pathIndex > 0) {
                  const prev = solutionPath[pathIndex - 1];
                  const prevCell = grid[prev.y][prev.x];

                  let dirToPrev;
                  if (prev.x === x + 1) dirToPrev = 1;
                  else if (prev.x === x - 1) dirToPrev = 3;
                  else if (prev.y === y + 1) dirToPrev = 2;
                  else if (prev.y === y - 1) dirToPrev = 0;

                  const oppDir = (dirToPrev + 2) % 4;
                  const currentConn = getPipeConnections(
                    cell.type,
                    cell.rotation,
                  );
                  const prevConn = getPipeConnections(
                    prevCell.type,
                    prevCell.rotation,
                  );

                  connectedToPrev =
                    currentConn.includes(dirToPrev) &&
                    prevConn.includes(oppDir);
                }

                // Check connection to next pipe
                if (pathIndex < solutionPath.length - 1) {
                  const next = solutionPath[pathIndex + 1];
                  const nextCell = grid[next.y][next.x];

                  let dirToNext;
                  if (next.x === x + 1) dirToNext = 1;
                  else if (next.x === x - 1) dirToNext = 3;
                  else if (next.y === y + 1) dirToNext = 2;
                  else if (next.y === y - 1) dirToNext = 0;

                  const oppDir = (dirToNext + 2) % 4;
                  const currentConn = getPipeConnections(
                    cell.type,
                    cell.rotation,
                  );
                  const nextConn = getPipeConnections(
                    nextCell.type,
                    nextCell.rotation,
                  );

                  connectedToNext =
                    currentConn.includes(dirToNext) &&
                    nextConn.includes(oppDir);
                }

                isCorrect = connectedToPrev && connectedToNext;
              }

              drawPipe(
                x,
                y,
                cell.type,
                cell.rotation,
                highlightPath,
                !highlightPath && isCorrect,
              );
            } else {
              // This is a decoy pipe
              drawPipe(x, y, cell.type, cell.rotation, false, false);
            }
          }
        }

        // Draw start marker
        const startX =
          solutionPath[0].x * config.CELL_SIZE + config.CELL_SIZE / 2;
        const startY =
          solutionPath[0].y * config.CELL_SIZE + config.CELL_SIZE / 2;
        ctx.fillStyle = "#00ff00";
        ctx.beginPath();
        ctx.arc(startX, startY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw end marker
        const endPos = solutionPath[solutionPath.length - 1];
        const endX = endPos.x * config.CELL_SIZE + config.CELL_SIZE / 2;
        const endY = endPos.y * config.CELL_SIZE + config.CELL_SIZE / 2;
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(endX, endY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Helper to get which sides a pipe connects to
      function getPipeConnections(type, rotation) {
        // Returns array of directions: 0=top, 1=right, 2=bottom, 3=left
        if (type === PIPE_STRAIGHT) {
          if (rotation === 0 || rotation === 2) {
            return [0, 2]; // vertical: top and bottom
          } else {
            return [1, 3]; // horizontal: right and left
          }
        } else {
          // Corner pipe rotations: 0=top-right, 1=right-bottom, 2=bottom-left, 3=left-top
          const corners = [
            [0, 1], // rotation 0: top and right
            [1, 2], // rotation 1: right and bottom
            [2, 3], // rotation 2: bottom and left
            [3, 0], // rotation 3: left and top
          ];
          return corners[rotation];
        }
      }

      function checkSolution() {
        // Trace through the solution path to verify connectivity
        for (let i = 0; i < solutionPath.length - 1; i++) {
          const current = solutionPath[i];
          const next = solutionPath[i + 1];
          const currentCell = grid[current.y][current.x];
          const nextCell = grid[next.y][next.x];

          // Determine the direction from current to next
          let directionToNext;
          if (next.x === current.x + 1)
            directionToNext = 1; // right
          else if (next.x === current.x - 1)
            directionToNext = 3; // left
          else if (next.y === current.y + 1)
            directionToNext = 2; // bottom
          else if (next.y === current.y - 1) directionToNext = 0; // top

          // Opposite directions
          const oppositeDir = (directionToNext + 2) % 4;

          // Check if current pipe connects in the direction of next
          const currentConnections = getPipeConnections(
            currentCell.type,
            currentCell.rotation,
          );
          if (!currentConnections.includes(directionToNext)) {
            return false;
          }

          // Check if next pipe connects back to current
          const nextConnections = getPipeConnections(
            nextCell.type,
            nextCell.rotation,
          );
          if (!nextConnections.includes(oppositeDir)) {
            return false;
          }
        }
        return true;
      }

      let solved = false;

      canvas.addEventListener("click", (e) => {
        if (solved) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        const gridX = Math.floor((clickX / rect.width) * config.GRID_SIZE);
        const gridY = Math.floor((clickY / rect.height) * config.GRID_SIZE);

        if (
          gridX >= 0 &&
          gridX < config.GRID_SIZE &&
          gridY >= 0 &&
          gridY < config.GRID_SIZE
        ) {
          const cell = grid[gridY][gridX];
          // Allow rotating ANY pipe (decoy or solution)
          cell.rotation = (cell.rotation + 1) % 4;
          drawGrid();

          // Only check solution if all solution pipes are correct
          if (checkSolution()) {
            solved = true;
            game.getQuestionElement().textContent =
              "Connected! Water is flowing!";

            // Animate water flow
            drawGrid(true);

            setTimeout(() => {
              game.nextLevel();
            }, 1500);
          }
        }
      });

      drawGrid();
    },
  },

  // Level 2: Simple YES/NO
  {
    render: () => {
      game.getQuestionElement().textContent = "Do you want to continue?";

      const yesBtn = createButton("YES", game.nextLevel);
      const noBtn = createButton("NO", game.die);

      const container = game.getButtonsElement();
      container.appendChild(yesBtn);
      container.appendChild(noBtn);
    },
  },

  // Level 3: Many Buttons Timer
  {
    render: () => {
      const config = LEVEL_CONFIG.MANY_BUTTONS;
      const questionEl = game.getQuestionElement();
      questionEl.innerHTML = `Do you want to continue?<br><span id='timer' style='font-size: 2rem; color: red;'>${config.TIMER_DURATION}</span>`;

      const container = game.getButtonsElement();

      const buttonCount =
        Math.floor(
          Math.random() * (config.MAX_BUTTONS - config.MIN_BUTTONS + 1),
        ) + config.MIN_BUTTONS;

      const buttonColor =
        config.BUTTON_COLORS[
          Math.floor(Math.random() * config.BUTTON_COLORS.length)
        ];

      const buttons = [];
      for (let i = 0; i < buttonCount; i++) {
        const isCorrect = i === 0;
        // Randomize button width between 90px and 130px (narrower range)
        const randomWidth = Math.floor(Math.random() * 40) + 90;
        buttons.push({
          text: isCorrect ? "YES" : "NO",
          onClick: isCorrect ? game.nextLevel : game.die,
          width: randomWidth,
        });
      }

      const shuffledButtons = shuffleArray(buttons);

      shuffledButtons.forEach((btnData) => {
        const btn = createButton(btnData.text, btnData.onClick, {
          background: buttonColor,
          minWidth: `${btnData.width}px`,
          maxWidth: `${btnData.width}px`,
          width: `${btnData.width}px`,
        });
        container.appendChild(btn);
      });

      let timeLeftMs = config.TIMER_DURATION * 1000;
      const startTime = Date.now();

      const timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        timeLeftMs = config.TIMER_DURATION * 1000 - elapsed;

        const timerEl = getElement("timer");
        if (timerEl) {
          if (timeLeftMs <= 0) {
            clearInterval(timerInterval);
            game.die();
          } else {
            timerEl.textContent = (timeLeftMs / 1000).toFixed(2);
          }
        } else {
          clearInterval(timerInterval);
        }
      }, 50);

      registerInterval(timerInterval);
    },
  },

  // Level 4: Position vs Label
  {
    render: () => {
      const config = LEVEL_CONFIG.NUMBERED_BUTTONS;
      const targetPosition =
        Math.floor(
          Math.random() * (config.MAX_POSITION - config.MIN_POSITION + 1),
        ) + config.MIN_POSITION;

      const positionWords = [
        "FIRST",
        "SECOND",
        "THIRD",
        "FOURTH",
        "FIFTH",
        "SIXTH",
        "SEVENTH",
        "EIGHTH",
        "NINTH",
        "TENTH",
      ];
      game.getQuestionElement().textContent = `Click the ${positionWords[targetPosition - 1]} button`;

      const container = game.getButtonsElement();

      const buttonNumbers = [];
      for (let i = 1; i <= config.BUTTON_COUNT; i++) {
        buttonNumbers.push(i);
      }
      const shuffledNumbers = shuffleArray(buttonNumbers);

      shuffledNumbers.forEach((num, position) => {
        const isCorrect = position + 1 === targetPosition;
        const btn = createButton(
          `Button ${num}`,
          isCorrect ? game.nextLevel : game.die,
        );
        container.appendChild(btn);
      });
    },
  },

  // Level 5: Traffic Light
  {
    render: () => {
      const config = LEVEL_CONFIG.TRAFFIC_LIGHT;

      const colorCount =
        Math.floor(
          Math.random() * (config.MAX_COLORS - config.MIN_COLORS + 1),
        ) + config.MIN_COLORS;

      const shuffledColorPool = shuffleArray([...config.COLOR_POOL]);
      const selectedColors = shuffledColorPool.slice(0, colorCount);

      const safeColorIndex = Math.floor(Math.random() * selectedColors.length);
      const safeColor = selectedColors[safeColorIndex];

      const reorderedColors = [
        safeColor,
        ...selectedColors.filter((c) => c !== safeColor),
      ];

      const cycleSpeed =
        Math.floor(
          Math.random() * (config.MAX_CYCLE_SPEED - config.MIN_CYCLE_SPEED + 1),
        ) + config.MIN_CYCLE_SPEED;

      game.getQuestionElement().textContent = `Wait for ${safeColor.name}, then click the button!`;

      const container = game.getButtonsElement();

      let currentColorIndex = 0;
      let canClick = false;

      const trafficBtn = createButton("CLICK ME", () => {
        if (!canClick) return;
        if (currentColorIndex === 0) {
          clearAllIntervals();
          game.nextLevel();
        } else {
          game.die();
        }
      });

      const updateButtonColor = () => {
        const currentColor = reorderedColors[currentColorIndex];
        trafficBtn.style.background = currentColor.hex;
      };

      updateButtonColor();

      const colorInterval = setInterval(() => {
        currentColorIndex = (currentColorIndex + 1) % reorderedColors.length;
        updateButtonColor();
        if (currentColorIndex === 1 && !canClick) {
          canClick = true;
        }
      }, cycleSpeed);

      registerInterval(colorInterval);

      container.appendChild(trafficBtn);
    },
  },

  // Level 6: Hard Math
  {
    render: () => {
      const config = LEVEL_CONFIG.MATH_QUIZ;
      const num1 =
        Math.floor(
          Math.random() * (config.MAX_NUMBER - config.MIN_NUMBER + 1),
        ) + config.MIN_NUMBER;
      const num2 =
        Math.floor(
          Math.random() * (config.MAX_NUMBER - config.MIN_NUMBER + 1),
        ) + config.MIN_NUMBER;

      const isAddition = Math.random() < 0.5;
      const correctAnswer = isAddition ? num1 + num2 : num1 - num2;
      const operator = isAddition ? "+" : "-";

      game.getQuestionElement().textContent = `What is ${num1} ${operator} ${num2}?`;

      const container = game.getButtonsElement();

      const answers = [correctAnswer];
      while (answers.length < config.ANSWER_COUNT) {
        const wrong =
          correctAnswer +
          Math.floor(Math.random() * config.VARIATION * 2) -
          config.VARIATION;
        if (!answers.includes(wrong)) {
          answers.push(wrong);
        }
      }

      const shuffledAnswers = shuffleArray(answers);

      shuffledAnswers.forEach((ans) => {
        const btn = createButton(
          ans.toString(),
          ans === correctAnswer ? game.nextLevel : game.die,
        );
        container.appendChild(btn);
      });
    },
  },

  // Level 7: Reverse Psychology
  {
    render: () => {
      game.getQuestionElement().textContent =
        "Don't click YES. I'm serious. Click NO.";

      const yesBtn = createButton("YES", game.nextLevel);
      const noBtn = createButton("NO", game.die);

      const container = game.getButtonsElement();
      container.appendChild(yesBtn);
      container.appendChild(noBtn);
    },
  },

  // Level 8: Precise Timing
  {
    render: () => {
      const config = LEVEL_CONFIG.PRECISE_TIMING;

      // Random target window
      const targetStart =
        Math.random() * (config.MAX_TARGET_START - config.MIN_TARGET_START) +
        config.MIN_TARGET_START;
      const targetEnd = targetStart + config.WINDOW_SIZE;
      const hideTime = targetStart - config.TIMER_HIDE_BEFORE;

      const questionEl = game.getQuestionElement();
      questionEl.innerHTML = `Click YES between ${targetStart.toFixed(1)} and ${targetEnd.toFixed(1)} seconds!<br><span id='precise-timer' style='font-size: 3rem; font-weight: bold; color: #000;'>0.0</span>`;

      const startTime = Date.now();
      let timerVisible = true;
      let clicked = false;

      const yesBtn = createButton("YES", () => {
        if (clicked) return;
        clicked = true;

        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const timerEl = getElement("precise-timer");

        // Stop the timer interval
        clearAllIntervals();

        // Show the actual click time
        if (timerEl) {
          timerEl.textContent = elapsedSeconds.toFixed(2);

          if (elapsedSeconds >= targetStart && elapsedSeconds <= targetEnd) {
            // Success - show in green
            timerEl.style.color = "#00ff00";
            yesBtn.disabled = true;

            setTimeout(() => {
              game.nextLevel();
            }, 1000);
          } else {
            // Failure - show in red
            timerEl.style.color = "#ff0000";
            yesBtn.disabled = true;

            setTimeout(() => {
              game.die();
            }, 1500);
          }
        } else {
          // Fallback if timer element not found
          if (elapsedSeconds >= targetStart && elapsedSeconds <= targetEnd) {
            game.nextLevel();
          } else {
            game.die();
          }
        }
      });

      const container = game.getButtonsElement();
      container.appendChild(yesBtn);

      const timerInterval = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const timerEl = getElement("precise-timer");

        if (timerEl) {
          // Hide timer when approaching target
          if (elapsedSeconds >= hideTime && timerVisible) {
            timerVisible = false;
            timerEl.textContent = "???";
            timerEl.style.color = "#999";
          } else if (timerVisible) {
            timerEl.textContent = elapsedSeconds.toFixed(1);
          }
        }
      }, 100);

      registerInterval(timerInterval);
    },
  },

  // Level 9: Alphabetical Sequence
  {
    render: () => {
      const config = LEVEL_CONFIG.SEQUENCE;
      game.getQuestionElement().textContent =
        "Click the buttons in alphabetical order!";

      const container = game.getButtonsElement();

      let currentStep = 0;
      const shuffledLetters = shuffleArray([...config.LETTERS]);

      shuffledLetters.forEach((letter) => {
        const btn = createButton(letter, () => {
          if (letter === config.LETTERS[currentStep]) {
            currentStep++;
            btn.style.opacity = "0.3";
            btn.disabled = true;

            if (currentStep === config.LETTERS.length) {
              game.nextLevel();
            }
          } else {
            game.die();
          }
        });
        container.appendChild(btn);
      });
    },
  },

  // Level 10: 3 Cup Monte
  {
    render: () => {
      const config = LEVEL_CONFIG.CUP_MONTE;

      game.getQuestionElement().textContent = "Watch carefully...";

      const container = game.getButtonsElement();
      container.style.display = "block";
      container.style.width = "100%";
      container.style.height = "500px";
      container.style.position = "relative";

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      container.appendChild(canvas);

      const width = container.offsetWidth;
      const height = container.offsetHeight;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x2a2a2a);

      const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
      camera.position.set(0, 5, 8);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      const tableGeometry = new THREE.PlaneGeometry(15, 10);
      const tableMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b6f47,
        roughness: 0.8,
      });
      const table = new THREE.Mesh(tableGeometry, tableMaterial);
      table.rotation.x = -Math.PI / 2;
      table.receiveShadow = true;
      scene.add(table);

      const cupGeometry = new THREE.CylinderGeometry(0.6, 0.8, 1.5, 32);
      const cupMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.7,
        metalness: 0.2,
      });

      const outlineMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.BackSide,
      });

      const cups = [
        { hasYes: true, position: 0, mesh: null, targetX: 0 },
        { hasYes: false, position: 1, mesh: null, targetX: 0 },
        { hasYes: false, position: 2, mesh: null, targetX: 0 },
      ];

      shuffleArray(cups);

      cups.forEach((cup, i) => {
        const mesh = new THREE.Mesh(cupGeometry, cupMaterial.clone());
        mesh.position.x = config.CUP_POSITIONS[i];
        mesh.position.y = 0.75;
        mesh.castShadow = true;
        mesh.userData = { cup, index: i };
        cup.mesh = mesh;
        cup.targetX = mesh.position.x;

        const outline = new THREE.Mesh(cupGeometry, outlineMaterial);
        outline.scale.multiplyScalar(1.05);
        mesh.add(outline);

        scene.add(mesh);

        const textCanvas = document.createElement("canvas");
        textCanvas.width = 256;
        textCanvas.height = 128;
        const ctx = textCanvas.getContext("2d");

        if (cup.hasYes) {
          ctx.fillStyle = "#00ff00";
          ctx.fillRect(0, 0, 256, 128);
          ctx.strokeStyle = "#000";
          ctx.lineWidth = 8;
          ctx.strokeRect(0, 0, 256, 128);
          ctx.fillStyle = "#000";
          ctx.font = "bold 70px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("YES", 128, 64);
        } else {
          ctx.fillStyle = "#ff4444";
          ctx.font = "bold 50px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("NO", 128, 64);
        }

        const textTexture = new THREE.CanvasTexture(textCanvas);
        const textMaterial = new THREE.MeshBasicMaterial({
          map: textTexture,
          transparent: true,
        });
        const textPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(2, 1),
          textMaterial,
        );
        textPlane.position.y = 0.01;
        textPlane.rotation.x = -Math.PI / 2;
        textPlane.visible = false;
        scene.add(textPlane);
        cup.textPlane = textPlane;
        cup.textPlaneTargetX = config.CUP_POSITIONS[i];
      });

      let canClick = false;
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      function animate() {
        requestAnimationFrame(animate);

        cups.forEach((cup) => {
          const dx = cup.targetX - cup.mesh.position.x;
          if (Math.abs(dx) > 0.01) {
            cup.mesh.position.x += dx * 0.1;
          } else {
            cup.mesh.position.x = cup.targetX;
          }

          const tdx = cup.textPlaneTargetX - cup.textPlane.position.x;
          if (Math.abs(tdx) > 0.01) {
            cup.textPlane.position.x += tdx * 0.1;
          } else {
            cup.textPlane.position.x = cup.textPlaneTargetX;
          }
        });

        renderer.render(scene, camera);
      }

      animate();

      setTimeout(() => {
        cups.forEach((cup) => {
          cup.mesh.position.y = config.LIFT_HEIGHT;
          cup.textPlane.visible = true;
        });
      }, 500);

      setTimeout(() => {
        cups.forEach((cup) => {
          cup.mesh.position.y = 0.75;
          cup.textPlane.visible = false;
        });
      }, config.SHOW_DURATION);

      let shuffleCount = 0;
      const startShuffling = setTimeout(() => {
        game.getQuestionElement().textContent = "Follow the cup with YES!";

        const shuffleInterval = setInterval(() => {
          const i = Math.floor(Math.random() * 3);
          let j = Math.floor(Math.random() * 3);
          while (i === j) {
            j = Math.floor(Math.random() * 3);
          }

          const tempX = cups[i].targetX;
          cups[i].targetX = cups[j].targetX;
          cups[j].targetX = tempX;

          const tempTextX = cups[i].textPlaneTargetX;
          cups[i].textPlaneTargetX = cups[j].textPlaneTargetX;
          cups[j].textPlaneTargetX = tempTextX;

          [cups[i], cups[j]] = [cups[j], cups[i]];

          shuffleCount++;

          if (shuffleCount >= config.SHUFFLE_COUNT) {
            clearInterval(shuffleInterval);

            setTimeout(() => {
              game.getQuestionElement().textContent = "Which cup has YES?";
              canClick = true;
            }, config.SHUFFLE_SPEED);
          }
        }, config.SHUFFLE_SPEED);

        registerInterval(shuffleInterval);
      }, config.SHOW_DURATION + 500);

      registerInterval(startShuffling);

      let hoveredCup = null;

      canvas.addEventListener("mousemove", (event) => {
        if (!canClick) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cups.map((c) => c.mesh));

        if (intersects.length > 0) {
          const newHovered = intersects[0].object.userData.cup;
          if (newHovered !== hoveredCup) {
            if (hoveredCup) {
              hoveredCup.mesh.material.emissive.setHex(0x000000);
            }
            hoveredCup = newHovered;
            hoveredCup.mesh.material.emissive.setHex(0x333333);
            canvas.style.cursor = "pointer";
          }
        } else {
          if (hoveredCup) {
            hoveredCup.mesh.material.emissive.setHex(0x000000);
            hoveredCup = null;
          }
          canvas.style.cursor = "default";
        }
      });

      canvas.addEventListener("click", (event) => {
        if (!canClick) return;

        const rect = canvas.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(cups.map((c) => c.mesh));

        if (intersects.length > 0) {
          const clickedCup = intersects[0].object.userData.cup;
          canClick = false;
          canvas.style.cursor = "default";
          clearAllIntervals();

          clickedCup.mesh.position.y = config.LIFT_HEIGHT;
          clickedCup.textPlane.visible = true;

          setTimeout(() => {
            if (clickedCup.hasYes) {
              game.nextLevel();
            } else {
              game.die();
            }
          }, 1500);
        }
      });
    },
  },

  // Level 11: Pattern Memory
  {
    render: () => {
      const config = LEVEL_CONFIG.PATTERN_MEMORY;

      let correctPattern = "";
      for (let i = 0; i < config.PATTERN_LENGTH; i++) {
        const char =
          config.CHARACTERS[
            Math.floor(Math.random() * config.CHARACTERS.length)
          ];
        correctPattern += char;
      }

      game.getQuestionElement().innerHTML = `Remember this pattern: <span style="font-size: 2rem; color: red; letter-spacing: 3px;">${correctPattern}</span>`;

      const displayTimeout = setTimeout(() => {
        game.getQuestionElement().textContent = "What was the pattern?";

        const container = game.getButtonsElement();
        container.style.display = "grid";
        container.style.gridTemplateColumns = "repeat(2, 1fr)";
        container.style.gap = "15px";

        const generateWrongPattern = (strategy) => {
          let wrongPattern = "";

          switch (strategy) {
            case "swap_two": {
              wrongPattern = correctPattern;
              const i = Math.floor(Math.random() * (config.PATTERN_LENGTH - 1));
              wrongPattern =
                wrongPattern.substring(0, i) +
                wrongPattern[i + 1] +
                wrongPattern[i] +
                wrongPattern.substring(i + 2);
              break;
            }
            case "change_one": {
              const i = Math.floor(Math.random() * config.PATTERN_LENGTH);
              const chars = config.CHARACTERS.filter(
                (c) => c !== correctPattern[i],
              );
              wrongPattern =
                correctPattern.substring(0, i) +
                chars[Math.floor(Math.random() * chars.length)] +
                correctPattern.substring(i + 1);
              break;
            }
            case "reverse": {
              wrongPattern = correctPattern.split("").reverse().join("");
              break;
            }
            case "rotate": {
              const shift =
                Math.floor(Math.random() * config.PATTERN_LENGTH) + 1;
              wrongPattern =
                correctPattern.substring(shift) +
                correctPattern.substring(0, shift);
              break;
            }
            default: {
              for (let i = 0; i < config.PATTERN_LENGTH; i++) {
                if (Math.random() < 0.4) {
                  wrongPattern += correctPattern[i];
                } else {
                  const chars = config.CHARACTERS.filter(
                    (c) => c !== correctPattern[i],
                  );
                  wrongPattern +=
                    chars[Math.floor(Math.random() * chars.length)];
                }
              }
            }
          }

          return wrongPattern;
        };

        const options = [correctPattern];
        const strategies = [
          "swap_two",
          "swap_two",
          "change_one",
          "change_one",
          "reverse",
          "rotate",
          "random",
        ];

        let attempts = 0;
        while (options.length < config.OPTION_COUNT && attempts < 100) {
          attempts++;
          const strategy =
            strategies[Math.floor(Math.random() * strategies.length)];
          const wrongPattern = generateWrongPattern(strategy);

          if (
            !options.includes(wrongPattern) &&
            wrongPattern !== correctPattern
          ) {
            options.push(wrongPattern);
          }
        }

        const shuffledOptions = shuffleArray(options);

        shuffledOptions.forEach((pattern) => {
          const btn = createButton(
            pattern,
            pattern === correctPattern ? game.nextLevel : game.die,
            { letterSpacing: "3px", fontSize: "1.1rem" },
          );
          container.appendChild(btn);
        });
      }, config.DISPLAY_DURATION);

      registerInterval(displayTimeout);
    },
  },

  // Level 12: Tripwire Maze
  {
    render: () => {
      const config = LEVEL_CONFIG.TRIPWIRE_MAZE;

      // Position the meta panel at the top center
      const metaPanel = document.getElementById("meta-panel");
      if (metaPanel) {
        metaPanel.style.position = "fixed";
        metaPanel.style.top = "20px";
        metaPanel.style.left = "50%";
        metaPanel.style.transform = "translateX(-50%)";
        metaPanel.style.zIndex = "1000";
      }

      game.getQuestionElement().innerHTML =
        "Navigate your mouse from START to the YES button without touching the walls.";

      const container = game.getButtonsElement();
      container.style.display = "block";
      container.style.width = "100vw";
      container.style.height = "100vh";
      container.style.position = "fixed";
      container.style.top = "0";
      container.style.left = "0";
      container.style.margin = "0";
      container.style.padding = "0";

      const canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.background = "#fff";
      canvas.style.cursor = "none";
      container.appendChild(canvas);

      // Create custom cursor - simple black dot
      const cursorDot = document.createElement("div");
      cursorDot.className = "custom-cursor-dot";
      cursorDot.style.position = "fixed";
      cursorDot.style.width = "10px";
      cursorDot.style.height = "10px";
      cursorDot.style.borderRadius = "50%";
      cursorDot.style.background = "#000";
      cursorDot.style.pointerEvents = "none";
      cursorDot.style.zIndex = "10001";
      cursorDot.style.transform = "translate(-50%, -50%)";
      cursorDot.style.display = "none";
      document.body.appendChild(cursorDot);

      const ctx = canvas.getContext("2d");

      // Start zone on the left side, vertically centered
      const startZone = {
        x: 50,
        y: canvas.height / 2 - 60,
        width: 80,
        height: 120,
      };

      const endZone = {
        x: canvas.width - 130,
        y: canvas.height / 2 - 60,
        width: 80,
        height: 120,
      };

      // Generate path points - start from LEFT of start zone, go through it
      const pathPoints = [
        {
          x: startZone.x,
          y: startZone.y + startZone.height / 2,
        },
        {
          x: startZone.x + startZone.width,
          y: startZone.y + startZone.height / 2,
        },
      ];

      const segmentWidth =
        (endZone.x - startZone.x - startZone.width) / config.SEGMENTS;

      for (let i = 1; i < config.SEGMENTS; i++) {
        const x = startZone.x + startZone.width + i * segmentWidth;
        const y = canvas.height * 0.2 + Math.random() * (canvas.height * 0.6);
        pathPoints.push({ x, y });
      }

      pathPoints.push({ x: endZone.x, y: endZone.y + endZone.height / 2 });
      pathPoints.push({
        x: endZone.x + endZone.width,
        y: endZone.y + endZone.height / 2,
      });

      let isMouseInBounds = false;
      let hasStarted = false;
      let hasWon = false;
      let mazeRevealed = false;

      function isPointInPath(x, y) {
        // Check if coordinates are valid
        if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) {
          return false;
        }
        const imageData = ctx.getImageData(x, y, 1, 1).data;
        const r = imageData[0];
        const g = imageData[1];
        const b = imageData[2];

        // White path (255,255,255) or black buttons (0,0,0) are safe
        // Gray walls (#ccc = 204,204,204) are dangerous
        const isWhite = r > 240 && g > 240 && b > 240;
        const isBlack = r < 20 && g < 20 && b < 20;

        return isWhite || isBlack;
      }

      function isInStartZone(x, y) {
        return (
          x >= startZone.x &&
          x <= startZone.x + startZone.width &&
          y >= startZone.y &&
          y <= startZone.y + startZone.height
        );
      }

      function isInEndZone(x, y) {
        return (
          x >= endZone.x &&
          x <= endZone.x + endZone.width &&
          y >= endZone.y &&
          y <= endZone.y + endZone.height
        );
      }

      function drawInitialScreen() {
        // White background
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw START zone as a section of the path
        // Black border
        ctx.strokeStyle = "#000";
        ctx.lineWidth = config.PATH_WIDTH + 6;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(startZone.x, startZone.y + startZone.height / 2);
        ctx.lineTo(
          startZone.x + startZone.width,
          startZone.y + startZone.height / 2,
        );
        ctx.stroke();

        // White center
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = config.PATH_WIDTH;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(startZone.x, startZone.y + startZone.height / 2);
        ctx.lineTo(
          startZone.x + startZone.width,
          startZone.y + startZone.height / 2,
        );
        ctx.stroke();

        // Draw left border using stroke to match the path border style
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(
          startZone.x,
          startZone.y + startZone.height / 2 - (config.PATH_WIDTH + 6) / 2,
        );
        ctx.lineTo(
          startZone.x,
          startZone.y + startZone.height / 2 + (config.PATH_WIDTH + 6) / 2,
        );
        ctx.stroke();

        // START text in black
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        ctx.fillText(
          "START",
          startZone.x + startZone.width / 2,
          startZone.y + startZone.height / 2 + 6,
        );
      }

      function revealMaze() {
        // Draw white background
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the gray walls background
        ctx.fillStyle = "#ddd";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw black border around the path (includes start and end zones)
        ctx.strokeStyle = "#000";
        ctx.lineWidth = config.PATH_WIDTH + 6;
        ctx.lineCap = "butt";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length; i++) {
          ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        ctx.stroke();

        // Draw the white safe path on top
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = config.PATH_WIDTH;
        ctx.lineCap = "butt";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length; i++) {
          ctx.lineTo(pathPoints[i].x, pathPoints[i].y);
        }
        ctx.stroke();
      }

      // Create YES button (hidden initially)
      const yesButton = createButton("YES", () => {
        // Remove button and cursor dot before transitioning
        yesButton.remove();
        cursorDot.remove();
        game.nextLevel();
      });
      yesButton.style.position = "fixed";
      yesButton.style.left = `${endZone.x + endZone.width / 2}px`;
      yesButton.style.top = `${endZone.y + endZone.height / 2}px`;
      yesButton.style.transform = "translate(-50%, -50%)";
      yesButton.style.display = "none";
      yesButton.style.zIndex = "10000";
      yesButton.style.padding = "10px 20px";
      yesButton.style.fontSize = "16px";
      yesButton.style.cursor = "pointer";
      yesButton.style.pointerEvents = "auto";
      document.body.appendChild(yesButton);

      // Initial draw
      drawInitialScreen();

      // Track cursor position
      document.addEventListener("mousemove", (e) => {
        cursorDot.style.left = `${e.clientX}px`;
        cursorDot.style.top = `${e.clientY}px`;
      });

      canvas.addEventListener("mouseenter", (e) => {
        isMouseInBounds = true;
        cursorDot.style.display = "block";
        const x = e.clientX;
        const y = e.clientY;

        // Only die if maze is revealed and entering at unsafe location
        if (mazeRevealed && hasStarted && !isPointInPath(x, y)) {
          game.die();
        }
      });

      canvas.addEventListener("mouseleave", () => {
        isMouseInBounds = false;
        cursorDot.style.display = "none";
        if (mazeRevealed && hasStarted && !hasWon) {
          game.die();
        }
      });

      canvas.addEventListener("mousemove", (e) => {
        if (!isMouseInBounds || hasWon) return;

        const x = e.clientX;
        const y = e.clientY;

        // Check if mouse enters start zone
        if (!hasStarted && isInStartZone(x, y)) {
          hasStarted = true;
          mazeRevealed = true;
          revealMaze();
        }

        // After maze is revealed, check for collisions
        if (mazeRevealed && hasStarted) {
          if (isInEndZone(x, y)) {
            hasWon = true;
            // Show YES button and hide custom cursor
            yesButton.style.display = "block";
            cursorDot.style.display = "none";
            canvas.style.cursor = "default";
          } else if (!isPointInPath(x, y)) {
            game.die();
          }
        }
      });
    },
  },

  // Level 13: Dog Breed Identification
  {
    render: async () => {
      const config = LEVEL_CONFIG.DOG_BREED;

      game.getQuestionElement().innerHTML = "Loading dog image...";

      const container = game.getButtonsElement();
      container.style.textAlign = "center";

      try {
        // Fetch a random dog image
        const response = await fetch(config.API_URL);
        const data = await response.json();

        if (!data.message) {
          throw new Error("Failed to load dog image");
        }

        const imageUrl = data.message;
        // Extract breed from URL format: https://images.dog.ceo/breeds/hound-afghan/n02088094_1003.jpg
        // Format is: /breeds/BREED-SUBBREED/ or /breeds/BREED/
        const urlParts = imageUrl.split("/");
        const breedIndex = urlParts.indexOf("breeds") + 1;
        const breedPart = urlParts[breedIndex];
        const breedParts = breedPart.split("-");

        let correctBreed;
        if (breedParts.length > 1) {
          // Sub-breed format: "hound-afghan" -> "Afghan Hound"
          correctBreed =
            breedParts[1].charAt(0).toUpperCase() +
            breedParts[1].slice(1) +
            " " +
            breedParts[0].charAt(0).toUpperCase() +
            breedParts[0].slice(1);
        } else {
          // Simple breed: "labrador" -> "Labrador"
          correctBreed = breedPart.charAt(0).toUpperCase() + breedPart.slice(1);
        }

        // Fetch all breeds to create wrong answers
        const breedsResponse = await fetch(config.ALL_BREEDS_URL);
        const breedsData = await breedsResponse.json();
        const allBreeds = [];

        for (const [breed, subBreeds] of Object.entries(breedsData.message)) {
          if (subBreeds.length > 0) {
            for (const subBreed of subBreeds) {
              allBreeds.push(
                subBreed.charAt(0).toUpperCase() +
                  subBreed.slice(1) +
                  " " +
                  breed.charAt(0).toUpperCase() +
                  breed.slice(1),
              );
            }
          } else {
            allBreeds.push(breed.charAt(0).toUpperCase() + breed.slice(1));
          }
        }

        // Filter out the correct breed and shuffle
        const wrongBreeds = allBreeds.filter((b) => b !== correctBreed);
        const shuffledWrong = shuffleArray(wrongBreeds);

        // Create answer options
        const options = [correctBreed];
        for (
          let i = 0;
          i < config.ANSWER_COUNT - 1 && i < shuffledWrong.length;
          i++
        ) {
          options.push(shuffledWrong[i]);
        }
        const shuffledOptions = shuffleArray(options);

        // Display the dog image
        game.getQuestionElement().innerHTML = "What breed is this dog?";

        const img = document.createElement("img");
        img.src = imageUrl;
        img.style.maxWidth = "500px";
        img.style.maxHeight = "400px";
        img.style.borderRadius = "8px";
        img.style.marginBottom = "20px";
        img.style.border = "3px solid #000";
        container.appendChild(img);

        // Create answer buttons
        const buttonsContainer = document.createElement("div");
        buttonsContainer.style.display = "grid";
        buttonsContainer.style.gridTemplateColumns = "repeat(2, 1fr)";
        buttonsContainer.style.gap = "15px";
        buttonsContainer.style.maxWidth = "500px";
        buttonsContainer.style.margin = "0 auto";

        for (const breed of shuffledOptions) {
          const btn = createButton(
            breed,
            breed === correctBreed ? game.nextLevel : game.die,
          );
          buttonsContainer.appendChild(btn);
        }

        container.appendChild(buttonsContainer);
      } catch (error) {
        console.error("Error loading dog API:", error);
        game.getQuestionElement().textContent =
          "Failed to load dog image. Click YES to continue.";
        const fallbackBtn = createButton("YES", game.nextLevel);
        container.appendChild(fallbackBtn);
      }
    },
  },
];

// Level Order Summary:
// 1. Introduction
// 2. Pong (survive 10 hits)
// 3. Frogs and Toads Puzzle (swap 3 frogs and 3 toads)
// 4. Lights Out Puzzle (4x4 grid)
// 5. Pipe Rotation Puzzle (10x10 grid)
// 6. Simple YES/NO
// 7. Many Buttons Timer
// 8. Position vs Label
// 9. Traffic Light
// 10. Hard Math
// 11. Reverse Psychology
// 12. Precise Timing
// 13. Alphabetical Sequence
// 14. 3 Cup Monte
// 15. Pattern Memory
// 16. Tripwire Maze
// 17. Dog Breed Identification

function renderLevel() {
  const level = levels[gameState.currentLevel - 1];

  // Track level start time for analytics
  analytics.startLevel();

  const levelIndicator = getElement("current-level");
  if (levelIndicator) {
    levelIndicator.textContent = gameState.currentLevel;
  }

  const questionEl = game.getQuestionElement();
  const buttonsEl = game.getButtonsElement();
  const metaPanel = document.getElementById("meta-panel");
  const container = game.getContainer();

  // Reset all element styles to defaults
  questionEl.textContent = "";
  questionEl.innerHTML = "";
  questionEl.style.cssText = "";
  buttonsEl.innerHTML = "";
  buttonsEl.style.cssText = "";

  // Reset meta panel visibility
  if (metaPanel) {
    metaPanel.style.display = "";
  }

  // Reset container styles (but preserve necessary ones)
  container.style.maxWidth = "";
  container.style.padding = "";
  container.style.margin = "";
  container.style.opacity = "0";
  container.style.transition = "opacity 0.3s ease";

  // Reset body cursor
  document.body.style.cursor = "";

  setTimeout(() => {
    container.style.opacity = "1";
  }, 50);

  level.render();
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize analytics
  analytics.init();

  const urlParams = new URLSearchParams(window.location.search);
  const debugLevel = urlParams.get("level");
  if (debugLevel && !isNaN(debugLevel)) {
    const level = parseInt(debugLevel, 10);
    if (level >= 1 && level <= levels.length) {
      gameState.currentLevel = level;
    }
  }

  loadProgress();
  renderLevel();

  const timerInterval = setInterval(() => {
    const elapsedSeconds = Math.floor(
      (Date.now() - gameState.startTime) / 1000,
    );
    const timerEl = getElement("elapsed-time");
    if (timerEl) {
      timerEl.textContent = elapsedSeconds;
    }
  }, 1000);

  registerPersistentInterval(timerInterval);

  const debugPanel = getElement("debug-panel");
  const debugToggle = getElement("debug-toggle");
  const debugClose = getElement("debug-close");

  if (debugToggle && debugPanel) {
    debugToggle.addEventListener("click", () => {
      const isVisible = debugPanel.style.display === "block";
      debugPanel.style.display = isVisible ? "none" : "block";
    });
  }

  if (debugClose && debugPanel) {
    debugClose.addEventListener("click", () => {
      debugPanel.style.display = "none";
    });
  }

  const debugSkip = getElement("debug-skip");
  if (debugSkip) {
    debugSkip.addEventListener("click", () => {
      game.nextLevel();
    });
  }

  const debugWin = getElement("debug-win");
  if (debugWin) {
    debugWin.addEventListener("click", () => {
      game.victory();
    });
  }

  const debugDie = getElement("debug-die");
  if (debugDie) {
    debugDie.addEventListener("click", () => {
      game.die();
    });
  }

  const debugGoto = getElement("debug-goto");
  const debugGotoBtn = getElement("debug-goto-btn");
  if (debugGoto && debugGotoBtn) {
    debugGotoBtn.addEventListener("click", () => {
      const targetLevel = parseInt(debugGoto.value, 10);
      if (targetLevel >= 1 && targetLevel <= levels.length) {
        clearAllIntervals();
        gameState.currentLevel = targetLevel;
        renderLevel();
      }
    });
  }

  const debugClearScores = getElement("debug-clear-scores");
  if (debugClearScores) {
    debugClearScores.addEventListener("click", () => {
      if (confirm("Clear all high scores? This cannot be undone.")) {
        storage.set(GAME_CONFIG.SCORES_KEY, "[]");
        alert("High scores cleared!");
      }
    });
  }

  const debugClearProgress = getElement("debug-clear-progress");
  if (debugClearProgress) {
    debugClearProgress.addEventListener("click", () => {
      if (confirm("Clear your progress? This cannot be undone.")) {
        storage.set(GAME_CONFIG.LEVEL_KEY, "1");
        storage.set(GAME_CONFIG.ATTEMPTS_KEY, "0");
        gameState.currentLevel = 1;
        gameState.totalAttempts = 0;
        clearAllIntervals();
        renderLevel();
        alert("Progress cleared!");
      }
    });
  }

  const debugClearAll = getElement("debug-clear-all");
  if (debugClearAll) {
    debugClearAll.addEventListener("click", () => {
      if (
        confirm(
          "Clear EVERYTHING (scores, progress, all data)? This cannot be undone!",
        )
      ) {
        storage.set(GAME_CONFIG.SCORES_KEY, "[]");
        storage.set(GAME_CONFIG.LEVEL_KEY, "1");
        storage.set(GAME_CONFIG.ATTEMPTS_KEY, "0");
        storage.set("justDied", "false");
        storage.set("hasWon", "false");
        storage.set("victoryTime", "0");
        gameState.currentLevel = 1;
        gameState.totalAttempts = 0;
        clearAllIntervals();
        renderLevel();
        alert("Everything cleared!");
      }
    });
  }

  const debugResetTimer = getElement("debug-reset-timer");
  if (debugResetTimer) {
    debugResetTimer.addEventListener("click", () => {
      gameState.startTime = Date.now();
    });
  }

  const debugAddTime = getElement("debug-add-time");
  if (debugAddTime) {
    debugAddTime.addEventListener("click", () => {
      gameState.startTime -= 10000;
    });
  }

  const debugSubTime = getElement("debug-sub-time");
  if (debugSubTime) {
    debugSubTime.addEventListener("click", () => {
      gameState.startTime += 10000;
    });
  }
});

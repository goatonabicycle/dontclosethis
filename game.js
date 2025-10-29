// Don't Close This - Game Logic

const GAME_CONFIG = {
  STORAGE_KEY: "dontCloseThis",
  PLAYER_KEY: "playerInitials",
  SCORES_KEY: "highScores",
  DEFAULT_INITIALS: "AAA",
};

const LEVEL_CONFIG = {
  MANY_BUTTONS: {
    MIN_BUTTONS: 15,
    MAX_BUTTONS: 25,
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
  BUTTON_SWAP: {
    SWAP_DELAY: 2000,
  },
  PATTERN_MEMORY: {
    PATTERN_LENGTH: 5,
    CHARACTERS: ["A", "B", "C", "D", "E"],
    OPTION_COUNT: 5,
    DISPLAY_DURATION: 3000,
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
    level: gameState.currentLevel,
    attempts: gameState.totalAttempts,
    timeElapsed: timeElapsed,
    timestamp: Date.now(),
  });

  storage.setJSON(GAME_CONFIG.SCORES_KEY, scores);
}

const game = {
  nextLevel: function () {
    clearAllIntervals();
    gameState.currentLevel++;
    if (gameState.currentLevel > levels.length) {
      game.victory();
      return;
    }
    renderLevel();
  },

  die: () => {
    clearAllIntervals();
    gameState.totalAttempts++;
    saveProgress();
    saveHighScore();

    storage.set("justDied", "true");

    window.close();
    setTimeout(() => {
      window.location.href = "about:blank";
    }, 100);
  },

  victory: () => {
    clearAllIntervals();
    gameState.totalAttempts++;
    saveProgress();
    saveHighScore();

    storage.set("hasWon", "true");
    const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    storage.set("victoryTime", timeElapsed.toString());

    window.close();
    setTimeout(() => {
      window.location.href = "about:blank";
    }, 100);
  },

  getContainer: () => getElement("game-container"),
  getQuestionElement: () => getElement("question"),
  getButtonsElement: () => getElement("buttons"),
};

const levels = [
  {
    render: () => {
      game.getQuestionElement().innerHTML = `
        <div style="margin-bottom: 20px;">
          <strong>Warning:</strong> Something is trying to close this tab.
        </div>
        <div style="margin-bottom: 20px; font-size: 0.9rem;">
          Your goal is to keep it open by making the right choices.
          If you click wrong, the tab will close. Don't let that happen!
        </div>
        <div>Ready to begin?</div>
      `;
      const btn = createButton("YES", game.nextLevel);
      game.getButtonsElement().appendChild(btn);
    },
  },

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
        buttons.push({
          text: isCorrect ? "YES" : "NO",
          onClick: isCorrect ? game.nextLevel : game.die,
        });
      }

      const shuffledButtons = shuffleArray(buttons);

      shuffledButtons.forEach((btnData) => {
        const btn = createButton(btnData.text, btnData.onClick, {
          background: buttonColor,
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

      const cycleSpeed =
        Math.floor(
          Math.random() * (config.MAX_CYCLE_SPEED - config.MIN_CYCLE_SPEED + 1),
        ) + config.MIN_CYCLE_SPEED;

      game.getQuestionElement().textContent = `Wait for ${safeColor.name}, then click the button!`;

      const container = game.getButtonsElement();

      let currentColorIndex = 0;

      const trafficBtn = createButton("CLICK ME", () => {
        if (currentColorIndex === safeColorIndex) {
          clearAllIntervals();
          game.nextLevel();
        } else {
          game.die();
        }
      });

      const updateButtonColor = () => {
        const currentColor = selectedColors[currentColorIndex];
        trafficBtn.style.background = currentColor.hex;
      };

      updateButtonColor();

      const colorInterval = setInterval(() => {
        currentColorIndex = (currentColorIndex + 1) % selectedColors.length;
        updateButtonColor();
      }, cycleSpeed);

      registerInterval(colorInterval);

      container.appendChild(trafficBtn);
    },
  },

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

  {
    render: () => {
      const config = LEVEL_CONFIG.BUTTON_SWAP;
      game.getQuestionElement().textContent = "Click the LEFT button";

      const container = game.getButtonsElement();

      const leftBtn = createButton("LEFT", game.nextLevel);
      const rightBtn = createButton("RIGHT", game.die);

      container.appendChild(leftBtn);
      container.appendChild(rightBtn);

      const swapTimeout = setTimeout(() => {
        container.innerHTML = "";
        container.appendChild(rightBtn);
        container.appendChild(leftBtn);
      }, config.SWAP_DELAY);

      registerInterval(swapTimeout);
    },
  },

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

        const options = [correctPattern];

        while (options.length < config.OPTION_COUNT) {
          let wrongPattern = "";
          for (let i = 0; i < config.PATTERN_LENGTH; i++) {
            if (Math.random() < 0.3) {
              wrongPattern += correctPattern[i];
            } else {
              const chars = config.CHARACTERS.filter(
                (c) => c !== correctPattern[i],
              );
              wrongPattern += chars[Math.floor(Math.random() * chars.length)];
            }
          }

          if (!options.includes(wrongPattern)) {
            options.push(wrongPattern);
          }
        }

        const shuffledOptions = shuffleArray(options);

        shuffledOptions.forEach((pattern) => {
          const btn = createButton(
            pattern,
            pattern === correctPattern ? game.nextLevel : game.die,
            { letterSpacing: "3px" },
          );
          container.appendChild(btn);
        });
      }, config.DISPLAY_DURATION);

      registerInterval(displayTimeout);
    },
  },
];

function renderLevel() {
  const level = levels[gameState.currentLevel - 1];

  const levelIndicator = getElement("current-level");
  if (levelIndicator) {
    levelIndicator.textContent = gameState.currentLevel;
  }

  const questionEl = game.getQuestionElement();
  const buttonsEl = game.getButtonsElement();

  questionEl.textContent = "";
  questionEl.innerHTML = "";
  buttonsEl.innerHTML = "";
  buttonsEl.style.cssText = "";

  const container = game.getContainer();
  container.style.opacity = "0";
  container.style.transition = "opacity 0.3s ease";

  setTimeout(() => {
    container.style.opacity = "1";
  }, 50);

  level.render();
}

document.addEventListener("DOMContentLoaded", () => {
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
});

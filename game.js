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

    if (window.opener && !window.opener.closed) {
      window.close();
    } else {
      window.location.href = "index.html";
    }
  },

  victory: () => {
    clearAllIntervals();
    gameState.totalAttempts++;
    saveProgress();
    saveHighScore();

    storage.set("hasWon", "true");
    const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
    storage.set("victoryTime", timeElapsed.toString());

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
        ctx.lineTo(startZone.x + startZone.width, startZone.y + startZone.height / 2);
        ctx.stroke();

        // White center
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = config.PATH_WIDTH;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(startZone.x, startZone.y + startZone.height / 2);
        ctx.lineTo(startZone.x + startZone.width, startZone.y + startZone.height / 2);
        ctx.stroke();

        // Draw left border using stroke to match the path border style
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.lineCap = "butt";
        ctx.beginPath();
        ctx.moveTo(startZone.x, startZone.y + startZone.height / 2 - (config.PATH_WIDTH + 6) / 2);
        ctx.lineTo(startZone.x, startZone.y + startZone.height / 2 + (config.PATH_WIDTH + 6) / 2);
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
];

function renderLevel() {
  const level = levels[gameState.currentLevel - 1];

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

// Sistema de Preload e Gerenciamento de Assets
class AssetLoader {
  constructor() {
    this.images = {};
    this.audio = {};
    this.loadedAssets = 0;
    this.totalAssets = 0;
    this.defaultImage = this.createDefaultImage();
  }

  createDefaultImage() {
    const canvas = document.createElement("canvas");
    canvas.width = 20;
    canvas.height = 20;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FF0000";
    ctx.fillRect(0, 0, 20, 20);
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  async loadImage(key, src) {
    this.totalAssets++;
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images[key] = img;
        this.loadedAssets++;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Falha ao carregar imagem: ${src}`);
        this.images[key] = this.defaultImage;
        this.loadedAssets++;
        resolve(this.defaultImage);
      };
      img.src = src;
    });
  }

  async loadAudio(key, src) {
    this.totalAssets++;
    return new Promise((resolve) => {
      if (!src) {
        console.warn(`Caminho de áudio não encontrado para: ${key}`);
        this.loadedAssets++;
        resolve(null);
        return;
      }

      const audio = new Audio();
      audio.oncanplaythrough = () => {
        this.audio[key] = audio;
        this.loadedAssets++;
        resolve(audio);
      };

      audio.onerror = () => {
        console.warn(`Falha ao carregar áudio: ${src}`);
        this.loadedAssets++;
        resolve(null);
      };

      // Definir um timeout para caso o áudio demore muito para carregar
      setTimeout(() => {
        if (!this.audio[key]) {
          console.warn(`Timeout ao carregar áudio: ${src}`);
          this.loadedAssets++;
          resolve(null);
        }
      }, 5000);

      audio.src = src;
      audio.load();
    });
  }

  getLoadingProgress() {
    return this.totalAssets === 0
      ? 0
      : (this.loadedAssets / this.totalAssets) * 100;
  }
}

// Início do jogo com sistema de preload
document.addEventListener("DOMContentLoaded", async () => {
  // Mostrar tela de carregamento
  const loadingScreen = createLoadingScreen();
  document.body.appendChild(loadingScreen);

  // Inicializar loader de assets
  const assetLoader = new AssetLoader();

  try {
    // Carregar imagens
    const imagePromises = [
      assetLoader.loadImage(
        "shield",
        document.querySelector("#pw-Shield")?.src
      ),
      assetLoader.loadImage("speed", document.querySelector("#pw-Speed")?.src),
      assetLoader.loadImage(
        "doublePoints",
        document.querySelector("#pw-Shield")?.src // Assuming doublePoints uses shield image, correct if needed
      ),
      assetLoader.loadImage(
        "obstacle",
        document.querySelector("#Ob-Stone")?.src
      ),
    ];

    // Carregar áudios
    const audioPromises = [
      assetLoader.loadAudio("bgMusic", document.getElementById("bgMusic")?.src),
      assetLoader.loadAudio(
        "gameMusic",
        document.getElementById("gameMusic")?.src
      ),
      assetLoader.loadAudio(
        "eatSound",
        document.getElementById("eatSound")?.src
      ),
      assetLoader.loadAudio(
        "gameOverSound",
        document.getElementById("gameOverSound")?.src
      ),
      assetLoader.loadAudio(
        "powerUpSound",
        document.getElementById("power-Ups")?.src
      ),
    ];

    // Atualizar barra de progresso
    const updateProgress = setInterval(() => {
      const progress = assetLoader.getLoadingProgress();
      updateLoadingScreen(loadingScreen, progress);
    }, 100);

    // Aguardar carregamento de todos os assets
    await Promise.all([...imagePromises, ...audioPromises]);
    clearInterval(updateProgress);

    // Remover tela de carregamento
    document.body.removeChild(loadingScreen);

    // Iniciar configuração do jogo
    initGame(assetLoader);
  } catch (error) {
    console.error("Erro ao carregar assets:", error);
    showErrorScreen();
  }
});

// Funções auxiliares para tela de carregamento
function createLoadingScreen() {
  const div = document.createElement("div");
  div.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  div.innerHTML = `
    <h2 style="color: white;">Carregando Jogo...</h2>
    <div class="progress-bar" style="width: 200px; height: 20px; background: #333; border-radius: 10px; overflow: hidden;">
      <div class="progress" style="width: 0%; height: 100%; background: #4CAF50; transition: width 0.3s;"></div>
    </div>
  `;

  return div;
}

function updateLoadingScreen(screen, progress) {
  const progressBar = screen.querySelector(".progress");
  progressBar.style.width = `${progress}%`;
}

function showErrorScreen() {
  const div = document.createElement("div");
  div.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  div.innerHTML = `
    <h2 style="color: white;">Erro ao carregar o jogo</h2>
    <p style="color: white;">Tente recarregar a página</p>
    <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">Recarregar</button>
  `;

  document.body.appendChild(div);
}

// Função principal de inicialização do jogo
function initGame(assetLoader) {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  // Configuração do jogo
  const gameConfig = {
    gridSize: 20,
    initialSpeed: 100,
    powerUpDuration: 5000,
    speedBoostDuration: 10000, // Duração do aumento de velocidade
    fallbackColor: "#FF0000",
    obstacleSize: 25, // Aumentar o tamanho dos obstáculos
    powerUpSize: 25, // Aumentar o tamanho dos power-ups
  };

  // Estado do jogo com sistema de recuperação
  const gameState = new Proxy(
    {
      snake: [{ x: 250, y: 250 }],
      direction: { x: gameConfig.gridSize, y: 0 },
      food: null,
      powerUp: null,
      powerUpType: null,
      obstacles: [],
      score: 0,
      highScore: localStorage.getItem("highScore") || 0,
      lives: 5,
      speed: gameConfig.initialSpeed,
      hasShield: false,
      isPaused: false,
      gameRunning: false,
      fruitsEaten: 0, // Adicionado para rastrear frutas comidas
      doublePoints: false, // Adicionado para rastrear estado de pontos dobrados
    },
    {
      set: function (obj, prop, value) {
        obj[prop] = value;
        // Salvar estado crítico
        if (["score", "highScore", "lives"].includes(prop)) {
          localStorage.setItem(prop, value);
        }
        return true;
      },
    }
  );

  // Sistema de recuperação de erro durante o jogo
  function safeDrawImage(ctx, image, x, y, width, height) {
    try {
      if (image && image.complete) {
        ctx.drawImage(image, x, y, width, height);
      } else {
        ctx.fillStyle = gameConfig.fallbackColor;
        ctx.fillRect(x, y, width, height);
      }
    } catch (error) {
      console.warn("Erro ao desenhar imagem:", error);
      ctx.fillStyle = gameConfig.fallbackColor;
      ctx.fillRect(x, y, width, height);
    }
  }

  // Sistema de recuperação de erro para áudio
  function safePlayAudio(key, loop = false) {
    try {
      const audio = assetLoader.audio[key];
      if (!audio) return;

      audio.loop = loop;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn(`Erro ao tocar áudio ${key}:`, error);
        });
      }
    } catch (error) {
      console.warn(`Erro ao acessar áudio ${key}:`, error);
    }
  }

  // Exemplo de uso:
  function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar cobra com tratamento de erro
    const skinColor = getSkinColor(
      document.getElementById("skinSelect")?.value
    );
    gameState.snake.forEach((segment) => {
      try {
        ctx.fillStyle = skinColor;
        ctx.fillRect(
          segment.x,
          segment.y,
          gameConfig.gridSize - 2,
          gameConfig.gridSize - 2
        );
      } catch (error) {
        console.warn("Erro ao desenhar segmento da cobra:", error);
        ctx.fillStyle = gameConfig.fallbackColor;
        ctx.fillRect(
          segment.x,
          segment.y,
          gameConfig.gridSize - 2,
          gameConfig.gridSize - 2
        );
      }
    });

    // Desenhar comida com tratamento de erro
    if (gameState.food) {
      safeDrawImage(
        ctx,
        assetLoader.images.food,
        gameState.food.x,
        gameState.food.y,
        gameConfig.gridSize,
        gameConfig.gridSize
      );
    }

    // Desenhar power-up com tratamento de erro
    if (gameState.powerUp && gameState.powerUpType) {
      safeDrawImage(
        ctx,
        assetLoader.images[gameState.powerUpType],
        gameState.powerUp.x,
        gameState.powerUp.y,
        gameConfig.powerUpSize,
        gameConfig.powerUpSize
      );
    }

    // Desenhar obstáculos com tratamento de erro
    gameState.obstacles.forEach((obstacle) => {
      safeDrawImage(
        ctx,
        assetLoader.images.obstacle,
        obstacle.x,
        obstacle.y,
        gameConfig.obstacleSize,
        gameConfig.obstacleSize
      );
    });
  }

  // Inicializar eventos com tratamento de erro
  try {
    document.getElementById("startBtn")?.addEventListener("click", startGame);
    document.getElementById("pauseBtn")?.addEventListener("click", togglePause);
    document.getElementById("resetBtn")?.addEventListener("click", resetGame);
    document.addEventListener("keydown", handleKeyPress); // Corrected to addEventListener on document
  } catch (error) {
    console.error("Erro ao inicializar eventos:", error);
    showErrorScreen();
  }

  let gameLoop; // Declarar no escopo global

  function startGame() {
    if (gameState.gameRunning) return;

    gameState.gameRunning = true;
    safePlayAudio("bgMusic", true); // Tocar música de fundo em loop

    // Gerar a primeira comida
    generateFood();

    gameLoop = () => {
      if (!gameState.isPaused && gameState.gameRunning) {
        updateGame(); // Added updateGame function call
        drawGame();
        setTimeout(gameLoop, gameState.speed); // Using setTimeout for game speed control
      }
    };

    gameLoop();
  }

  function updateGame() {
    const head = {
      x: gameState.snake[0].x + gameState.direction.x,
      y: gameState.snake[0].y + gameState.direction.y,
    };

    // Check for collision with walls and wrap around
    if (head.x < 0) {
      head.x = canvas.width - gameConfig.gridSize;
    } else if (head.x >= canvas.width) {
      head.x = 0;
    } else if (head.y < 0) {
      head.y = canvas.height - gameConfig.gridSize;
    } else if (head.y >= canvas.height) {
      head.y = 0;
    }

    // Check for collision with itself
    for (let i = 1; i < gameState.snake.length; i++) {
      if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
        loseLife();
        return;
      }
    }

    gameState.snake.unshift(head); // Add new head

    // Check for food collision
    if (
      Math.abs(head.x - gameState.food.x) < gameConfig.gridSize &&
      Math.abs(head.y - gameState.food.y) < gameConfig.gridSize
    ) {
      eatFood();
    } else {
      gameState.snake.pop(); // Remove tail if no food eaten
    }

    // Check for power-up collision
    if (
      gameState.powerUp &&
      Math.abs(head.x - gameState.powerUp.x) < gameConfig.powerUpSize &&
      Math.abs(head.y - gameState.powerUp.y) < gameConfig.powerUpSize
    ) {
      collectPowerUp();
    }

    // Check for collision with obstacles
    for (let i = 0; i < gameState.obstacles.length; i++) {
      if (
        Math.abs(head.x - gameState.obstacles[i].x) < gameConfig.obstacleSize &&
        Math.abs(head.y - gameState.obstacles[i].y) < gameConfig.obstacleSize
      ) {
        if (!gameState.hasShield) {
          loseLife();
        }
        return;
      }
    }
  }

  function eatFood() {
    gameState.score += gameState.doublePoints ? 20 : 10; // Dobrar pontos se doublePoints estiver ativo
    gameState.fruitsEaten += 1;
    document.getElementById("score").innerText = gameState.score;
    safePlayAudio("eatSound");
    gameState.food = null; // Food is eaten, needs to be regenerated
    generateFood();

    if (gameState.score > gameState.highScore) {
      gameState.highScore = gameState.score;
      document.getElementById("highScore").innerText = gameState.highScore;
    }

    if (gameState.fruitsEaten % 10 === 0) {
      generatePowerUp();
    }

    if (gameState.obstacles.length < 3 && gameState.score % 100 === 0) {
      generateObstacle();
    }

    increaseSpeed();
  }

  function collectPowerUp() {
    safePlayAudio("powerUpSound");
    const powerUpType = gameState.powerUpType;
    gameState.powerUp = null;
    gameState.powerUpType = null;

    switch (powerUpType) {
      case "shield":
        activateShield();
        break;
      case "speed":
        activateSpeedBoost();
        break;
      case "doublePoints":
        activateDoublePoints();
        break;
    }
  }

  function activateShield() {
    gameState.hasShield = true;
    setTimeout(() => {
      gameState.hasShield = false;
    }, gameConfig.powerUpDuration);
  }

  function activateSpeedBoost() {
    gameState.speed = gameConfig.initialSpeed / 2;
    setTimeout(() => {
      gameState.speed = gameConfig.initialSpeed;
    }, gameConfig.speedBoostDuration);
  }

  function activateDoublePoints() {
    gameState.doublePoints = true;
    setTimeout(() => {
      gameState.doublePoints = false;
    }, gameConfig.powerUpDuration);
  }

  function loseLife() {
    gameState.lives--;
    document.getElementById("lives").innerText = gameState.lives;
    if (gameState.lives > 0) {
      alert("Você perdeu uma vida!");
      resetSnakePosition();
    } else {
      gameOver();
    }
  }

  function resetSnakePosition() {
    gameState.snake = [{ x: 250, y: 250 }];
    gameState.direction = { x: gameConfig.gridSize, y: 0 };
  }

  function gameOver() {
    gameState.gameRunning = false;
    assetLoader.audio["bgMusic"].pause(); // Parar a música de fundo
    safePlayAudio("gameOverSound");

    // Mostrar imagem de Game Over
    const gameOverImage = document.getElementById("gameOverImage");
    gameOverImage.style.display = "block";
    gameOverImage.style.position = "absolute";
    gameOverImage.style.top = "50%";
    gameOverImage.style.left = "50%";
    gameOverImage.style.transform = "translate(-50%, -50%)";
    gameOverImage.style.width = "90vw";
    gameOverImage.style.maxWidth = "500px";
    gameOverImage.style.height = "auto";

    // Manter a imagem até que um novo jogo seja iniciado
  }

  function increaseSpeed() {
    if (gameState.speed > 20 && gameState.score % 50 === 0) {
      gameState.speed -= 5;
    }
  }

  function generateFood() {
    let x, y, isValidPosition;
    do {
      x =
        Math.floor(Math.random() * (canvas.width / gameConfig.gridSize)) *
        gameConfig.gridSize;
      y =
        Math.floor(Math.random() * (canvas.height / gameConfig.gridSize)) *
        gameConfig.gridSize;
      isValidPosition = true;

      // Verificar se a posição não está colada em um obstáculo ou power-up
      for (let i = 0; i < gameState.obstacles.length; i++) {
        if (
          Math.abs(x - gameState.obstacles[i].x) < gameConfig.gridSize &&
          Math.abs(y - gameState.obstacles[i].y) < gameConfig.gridSize
        ) {
          isValidPosition = false;
          break;
        }
      }

      if (
        gameState.powerUp &&
        Math.abs(x - gameState.powerUp.x) < gameConfig.gridSize &&
        Math.abs(y - gameState.powerUp.y) < gameConfig.gridSize
      ) {
        isValidPosition = false;
      }
    } while (!isValidPosition);

    gameState.food = { x, y };
  }

  function generatePowerUp() {
    let x, y, isValidPosition;
    do {
      x =
        Math.floor(Math.random() * (canvas.width / gameConfig.gridSize)) *
        gameConfig.gridSize;
      y =
        Math.floor(Math.random() * (canvas.height / gameConfig.gridSize)) *
        gameConfig.gridSize;
      isValidPosition = true;

      // Verificar se a posição não está colada em um obstáculo ou comida
      for (let i = 0; i < gameState.obstacles.length; i++) {
        if (
          Math.abs(x - gameState.obstacles[i].x) < gameConfig.gridSize &&
          Math.abs(y - gameState.obstacles[i].y) < gameConfig.gridSize
        ) {
          isValidPosition = false;
          break;
        }
      }

      if (
        gameState.food &&
        Math.abs(x - gameState.food.x) < gameConfig.gridSize &&
        Math.abs(y - gameState.food.y) < gameConfig.gridSize
      ) {
        isValidPosition = false;
      }
    } while (!isValidPosition);

    const powerUpTypes = ["shield", "speed", "doublePoints"];
    const randomPowerUpType =
      powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    gameState.powerUp = { x, y };
    gameState.powerUpType = randomPowerUpType;
    setTimeout(() => {
      gameState.powerUp = null;
      gameState.powerUpType = null;
    }, gameConfig.powerUpDuration);
    safePlayAudio("powerUpSound");
  }

  function generateObstacle() {
    const x =
      Math.floor(Math.random() * (canvas.width / gameConfig.gridSize)) *
      gameConfig.gridSize;
    const y =
      Math.floor(Math.random() * (canvas.height / gameConfig.gridSize)) *
      gameConfig.gridSize;
    gameState.obstacles.push({ x, y });
  }

  function getSkinColor(skinValue) {
    const skinColors = {
      "Verde Clássico": "#4CAF50",
      "Azul Neon": "#00BCD4",
      "Vermelho Fogo": "#F44336",
      "Roxo Neon": "#9C27B0",
    };
    return skinColors[skinValue] || "#4CAF50"; // Cor padrão se não encontrar
  }

  function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    if (!gameState.isPaused) {
      gameLoop(); // Restart game loop if unpaused
    }
  }

  function resetGame() {
    gameState.snake = [{ x: 250, y: 250 }];
    gameState.direction = { x: gameConfig.gridSize, y: 0 };
    gameState.score = 0;
    gameState.lives = 5;
    gameState.speed = gameConfig.initialSpeed;
    gameState.hasShield = false;
    gameState.isPaused = false;
    gameState.gameRunning = false; // Ensure gameRunning is reset
    gameState.food = null;
    gameState.powerUp = null;
    gameState.powerUpType = null;
    gameState.obstacles = [];
    gameState.fruitsEaten = 0; // Reset fruits eaten
    gameState.doublePoints = false; // Reset double points
    document.getElementById("score").innerText = gameState.score;
    document.getElementById("lives").innerText = gameState.lives;
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
    safePlayAudio("bgMusic", true); // Reiniciar a música de fundo em loop

    // Ocultar imagem de Game Over ao iniciar um novo jogo
    const gameOverImage = document.getElementById("gameOverImage");
    gameOverImage.style.display = "none";
  }

  function handleKeyPress(event) {
    const keyActions = {
      ArrowUp: () => setDirection(0, -gameConfig.gridSize),
      ArrowDown: () => setDirection(0, gameConfig.gridSize),
      ArrowLeft: () => setDirection(-gameConfig.gridSize, 0),
      ArrowRight: () => setDirection(gameConfig.gridSize, 0),
      Escape: togglePause,
    };

    const action = keyActions[event.key];
    if (action && !gameState.isPaused && gameState.gameRunning) action(); // Only process keys if game is running and not paused
  }

  function setDirection(x, y) {
    // Previne movimento na direção oposta
    if (gameState.direction.x === -x || gameState.direction.y === -y) return;
    gameState.direction = { x, y };
  }
}

export function createGameState(options = {}) {
  const scorePerSecond = options.scorePerSecond ?? 10;
  const onRestart = options.onRestart;

  let gameOver = false;
  let score = 0;
  let bestScore = Number(localStorage.getItem('bestScore') || 0);

  const scoreElement = document.createElement('div');
  Object.assign(scoreElement.style, {
    position: 'fixed',
    top: '14px',
    left: '14px',
    fontFamily: 'monospace',
    fontSize: '24px',
    color: '#1f2937',
    zIndex: '999',
    userSelect: 'none'
  });
  document.body.appendChild(scoreElement);

  const bestElement = document.createElement('div');
  Object.assign(bestElement.style, {
    position: 'fixed',
    top: '44px',
    left: '14px',
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#1f2937',
    zIndex: '999',
    userSelect: 'none'
  });
  document.body.appendChild(bestElement);

  const gameOverElement = document.createElement('div');
  const gameOverTitleElement = document.createElement('div');
  gameOverTitleElement.textContent = 'Game Over';
  gameOverTitleElement.style.marginBottom = '10px';

  const finalScoreElement = document.createElement('div');
  finalScoreElement.style.fontSize = '24px';
  finalScoreElement.style.marginBottom = '14px';

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Restart';
  Object.assign(restartBtn.style, {
    background: '#1f2937',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontFamily: 'monospace',
    fontSize: '20px',
    padding: '10px 16px',
    cursor: 'pointer'
  });

  Object.assign(gameOverElement.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: '48px',
    color: '#b22222',
    background: 'rgba(255,255,255,0.92)',
    padding: '18px 24px',
    borderRadius: '12px',
    boxShadow: '0 6px 22px rgba(0,0,0,0.2)',
    display: 'none',
    zIndex: '999'
  });
  gameOverElement.appendChild(gameOverTitleElement);
  gameOverElement.appendChild(finalScoreElement);
  gameOverElement.appendChild(restartBtn);
  document.body.appendChild(gameOverElement);

  function updateScoreDisplay() {
    scoreElement.textContent = `Score: ${Math.floor(score)}`;
    bestElement.textContent = `Best: ${Math.floor(bestScore)}`;
  }

  function tick(dt) {
    if (gameOver) return;

    // time-based endless-runner scoring
    score += dt * scorePerSecond;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('bestScore', String(Math.floor(bestScore)));
    }
    updateScoreDisplay();
  }

  function setGameOver() {
    if (gameOver) return;

    gameOver = true;
    finalScoreElement.textContent = `Final Score: ${Math.floor(score)}`;
    gameOverElement.style.display = 'block';
  }

  function reset() {
    gameOver = false;
    score = 0;
    gameOverElement.style.display = 'none';
    updateScoreDisplay();
  }

  function addPoints(points) {
    if (gameOver) return;

    score += points;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('bestScore', String(Math.floor(bestScore)));
    }
    updateScoreDisplay();
  }

  restartBtn.addEventListener('click', () => {
    // main game owns world/dino reset; this module handles UI + game phase state
    if (onRestart) onRestart();
  });

  updateScoreDisplay();

  return {
    isGameOver: () => gameOver,
    getScore: () => score,
    tick,
    addPoints,
    setGameOver,
    reset
  };
}

export function createGameState(options = {}) {
  const scorePerSecond = options.scorePerSecond ?? 10;
  const onRestart = options.onRestart;

  let gameOver = false;
  let score = 0;
  let bestScore = Number(localStorage.getItem('bestScore') || 0);
  let dayCount = 0;
  let noticeTimeRemaining = 0;

  const scoreElement = document.createElement('div');
  Object.assign(scoreElement.style, {
    position: 'fixed',
    top: '14px',
    left: '14px',
    fontFamily: 'monospace',
    fontSize: '24px',
    color: '#ffffff',
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
    color: '#ffffff',
    zIndex: '999',
    userSelect: 'none'
  });
  document.body.appendChild(bestElement);

  const dayElement = document.createElement('div');
  Object.assign(dayElement.style, {
    position: 'fixed',
    top: '66px',
    left: '14px',
    fontFamily: 'monospace',
    fontSize: '18px',
    color: '#ffffff',
    zIndex: '999',
    userSelect: 'none'
  });
  document.body.appendChild(dayElement);

  const noticeElement = document.createElement('div');
  Object.assign(noticeElement.style, {
    position: 'fixed',
    top: '16%',
    left: '50%',
    transform: 'translateX(-50%)',
    fontFamily: 'monospace',
    fontSize: '25px',
    fontWeight: 'bold',
    color: '#7c2d12',
    background: 'rgba(255, 242, 204, 0.95)',
    border: '3px solid #b45309',
    borderRadius: '14px',
    padding: '12px 20px',
    minWidth: '440px',
    maxWidth: '640px',
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
    zIndex: '1000',
    display: 'none',
    userSelect: 'none',
    pointerEvents: 'none'
  });
  document.body.appendChild(noticeElement);

  const gameOverElement = document.createElement('div');
  const gameOverTitleElement = document.createElement('div');
  gameOverTitleElement.textContent = 'Game Over';
  gameOverTitleElement.style.marginBottom = '10px';

  const finalScoreElement = document.createElement('div');
  finalScoreElement.style.fontSize = '24px';
  finalScoreElement.style.marginBottom = '8px';

  const finalDayElement = document.createElement('div');
  finalDayElement.style.fontSize = '20px';
  finalDayElement.style.marginBottom = '14px';

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
  gameOverElement.appendChild(finalDayElement);
  gameOverElement.appendChild(restartBtn);
  document.body.appendChild(gameOverElement);

  function updateScoreDisplay() {
    scoreElement.textContent = `Score: ${Math.floor(score)}`;
    bestElement.textContent = `Best: ${Math.floor(bestScore)}`;
    dayElement.textContent = `Day: ${dayCount}`;
  }

  function tick(dt) {
    if (gameOver) return;

    // time-based endless-runner scoring
    score += dt * scorePerSecond;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('bestScore', String(Math.floor(bestScore)));
    }
    if (noticeTimeRemaining > 0) {
      noticeTimeRemaining -= dt;
      if (noticeTimeRemaining <= 0) {
        noticeElement.style.display = 'none';
      }
    }
    updateScoreDisplay();
  }

  function setGameOver() {
    if (gameOver) return;

    gameOver = true;
    finalScoreElement.textContent = `Final Score: ${Math.floor(score)}`;
    const dayWord = dayCount === 1 ? 'day' : 'days';
    finalDayElement.textContent = `Days Survived: ${dayCount} ${dayWord}`;
    gameOverElement.style.display = 'block';
  }

  function reset() {
    gameOver = false;
    score = 0;
    dayCount = 0;
    noticeTimeRemaining = 0;
    gameOverElement.style.display = 'none';
    noticeElement.style.display = 'none';
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

  function setDayCount(day) {
    dayCount = Math.max(0, day);
    updateScoreDisplay();
  }

  function showNotice(text, durationSeconds = 2.2) {
    noticeElement.textContent = `🦖 ${text} 🌵`;
    noticeElement.style.display = 'block';
    noticeTimeRemaining = durationSeconds;
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
    setDayCount,
    showNotice,
    setGameOver,
    reset
  };
}

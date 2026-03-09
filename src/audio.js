export function createAudioSystem() {
  const bgm = new Audio('assets/bgm.mp3');
  bgm.loop = true;
  bgm.preload = 'auto';
  bgm.volume = 0.42;

  const jumpSfx = new Audio('assets/jump.wav');
  jumpSfx.preload = 'auto';
  jumpSfx.volume = 0.45;

  const coinSfx = new Audio('assets/coin.wav');
  coinSfx.preload = 'auto';
  coinSfx.volume = 0.38;

  const gameOverSfx = new Audio('assets/gameover.wav');
  gameOverSfx.preload = 'auto';
  gameOverSfx.volume = 0.5;

  let unlocked = false;

  async function ensureUnlocked() {
    if (unlocked) return true;

    try {
      await bgm.play();
      bgm.pause();
      bgm.currentTime = 0;
      unlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  function playSfx(sample) {
    if (!unlocked) return;

    const instance = sample.cloneNode(true);
    instance.volume = sample.volume;
    instance.playbackRate = sample.playbackRate;
    instance.play().catch(() => {});
  }

  function startBgm() {
    if (!unlocked) return;
    if (!bgm.paused) return;
    bgm.play().catch(() => {});
  }

  function enableAutoplayUnlock() {
    const tryUnlock = async () => {
      const ok = await ensureUnlocked();
      if (!ok) return;
      startBgm();
      window.removeEventListener('pointerdown', tryUnlock);
      window.removeEventListener('keydown', tryUnlock);
      window.removeEventListener('touchstart', tryUnlock);
    };

    window.addEventListener('pointerdown', tryUnlock, { passive: true });
    window.addEventListener('keydown', tryUnlock);
    window.addEventListener('touchstart', tryUnlock, { passive: true });
  }

  function setMusicRate(rate) {
    bgm.playbackRate = Math.max(0.75, Math.min(2.0, rate));
  }

  function resetForRestart() {
    bgm.currentTime = 0;
    setMusicRate(1);
    startBgm();
  }

  return {
    enableAutoplayUnlock,
    setMusicRate,
    resetForRestart,
    playJump: () => playSfx(jumpSfx),
    playCoin: () => playSfx(coinSfx),
    playGameOver: () => playSfx(gameOverSfx)
  };
}

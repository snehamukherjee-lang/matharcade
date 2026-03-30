// Math Arcade - Retro Web Audio Synthesizer
// Generates zero-dependency 8-bit style sound effects

const MathArcadeAudio = (function() {
  let ctx = null;

  function init() {
    if (!ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        ctx = new AudioContext();
      }
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function playTone(freq, type, duration, vol=0.1) {
    init();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  return {
    init,
    playBlip: () => playTone(600, 'square', 0.1, 0.05),
    playSelect: () => playTone(800, 'square', 0.15, 0.08),
    playCoin: () => {
      init();
      if (!ctx) return;
      playTone(988, 'square', 0.1, 0.1); // B5
      setTimeout(() => playTone(1318, 'square', 0.4, 0.1), 100); // E6
    },
    playCorrect: () => {
      init();
      if (!ctx) return;
      playTone(523, 'square', 0.1, 0.08); // C5
      setTimeout(() => playTone(659, 'square', 0.1, 0.08), 100); // E5
      setTimeout(() => playTone(784, 'square', 0.2, 0.08), 200); // G5
    },
    playWrong: () => {
      init();
      if (!ctx) return;
      playTone(300, 'sawtooth', 0.2, 0.1);
      setTimeout(() => playTone(250, 'sawtooth', 0.3, 0.1), 150);
    },
    playWin: () => {
      init();
      if (!ctx) return;
      const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'square', 0.3, 0.1), i * 150);
      });
    }
  };
})();

// Expose to MathArcade namespace if it exists, otherwise attach to window
if (typeof MathArcade !== 'undefined') {
  MathArcade.Audio = MathArcadeAudio;
} else {
  window.MathArcadeAudio = MathArcadeAudio;
}

// Add global interaction listener to unlock audio context
document.addEventListener('click', () => {
  MathArcadeAudio.init();
}, { once: true });

// ─────────────────────────────────────────────
// Multiverse Cricket — Synthesized Audio FX
// ─────────────────────────────────────────────

const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Helper to play a synthesized beep
function playTone(freq, type, duration, vol = 0.1) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

export function playClickSound() {
  playTone(600, 'sine', 0.1, 0.05);
}

export function playLockSound() {
  playTone(300, 'square', 0.15, 0.05);
  setTimeout(() => playTone(400, 'square', 0.2, 0.05), 50);
}

export function playRevealSound() {
  playTone(800, 'sine', 0.3, 0.1);
  setTimeout(() => playTone(1200, 'sine', 0.5, 0.1), 100);
}

export function playWicketSound() {
  if (!audioCtx) return;
  // White noise explosion
  const bufferSize = audioCtx.sampleRate * 0.5;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const gainNode = audioCtx.createGain();
  gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
  noise.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  noise.start();
}

export function playBoundarySound() {
  playTone(440, 'triangle', 0.2, 0.1);
  setTimeout(() => playTone(554, 'triangle', 0.2, 0.1), 100);
  setTimeout(() => playTone(659, 'triangle', 0.4, 0.1), 200);
}

export function playSpecialBallSound() {
  playTone(900, 'sawtooth', 0.1, 0.05);
  setTimeout(() => playTone(700, 'sawtooth', 0.1, 0.05), 100);
  setTimeout(() => playTone(1000, 'sawtooth', 0.3, 0.05), 200);
}

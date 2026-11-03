// Typing sounds, synthesised with the Web Audio API.
//
// No audio files are bundled or downloaded: three short oscillator blips keep the bundle
// size unchanged and avoid any asset licence question. The context is created lazily on
// the first sound so browsers that require a user gesture are satisfied.

type SoundName = 'key' | 'error' | 'finish';

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

const TONES: Record<SoundName, { freq: number; durationMs: number; gain: number; type: OscillatorType }> = {
  key: { freq: 620, durationMs: 28, gain: 0.05, type: 'triangle' },
  error: { freq: 180, durationMs: 90, gain: 0.07, type: 'square' },
  finish: { freq: 880, durationMs: 180, gain: 0.06, type: 'sine' },
};

export function playSound(name: SoundName): void {
  const audio = context();
  if (!audio) return;
  try {
    if (audio.state === 'suspended') void audio.resume();
    const tone = TONES[name];
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.freq;
    gain.gain.setValueAtTime(tone.gain, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + tone.durationMs / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + tone.durationMs / 1000);
  } catch {
    /* audio is a nicety - never let it break typing */
  }
}

/**
 * Sound effects — the six audio files Human Benchmark ships, played through
 * WebAudio. HB uses Howler, which plays files as AudioBufferSources and
 * pitch-shifts them by setting playbackRate (2^(semitones/12)) — that is how
 * each sequence tile gets its own note from the single boop.mp3. Plain
 * <audio> would keep the pitch constant (preservesPitch), so WebAudio it is.
 *
 * React-free: games call playSound(), the header toggle subscribes via
 * subscribeSound().
 */

const FILES = {
  boop: '/audio/boop.mp3',
  victory: '/audio/victory.mp3',
  reveal: '/audio/reveal.mp3',
  go: '/audio/go.mp3',
  blipLow: '/audio/blipLow.mp3',
  blipHigh: '/audio/blipHigh.mp3',
} as const;

export type SoundName = keyof typeof FILES;

const STORAGE_KEY = 'brainbench-audio';

let muted = readMuted();
const listeners = new Set<() => void>();

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'off';
  } catch {
    return false; // storage unavailable — default to sound on
  }
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  if (value === muted) return;
  muted = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? 'off' : 'on');
  } catch {
    /* storage unavailable — mute lasts for this session only */
  }
  listeners.forEach((listener) => listener());
}

export function toggleSound(): void {
  setMuted(!muted);
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** HB pitch math: a major-scale step → playback-rate ratio (2^(semitones/12)). */
const SCALE = [0, 2, 4, 5, 7, 9, 11];

export function pitchRatio(step: number): number {
  const semitones = SCALE[((step % 7) + 7) % 7] + 12 * Math.floor(step / 7);
  return Math.pow(2, semitones / 12);
}

/** HB's sequence-test tile → scale-step mapping (top-left … bottom-right). */
export const SEQUENCE_TILE_STEP = [6, 7, 8, 3, 4, 5, 0, 1, 2];

/* ------------------------------------------------------------------ */
/* WebAudio engine                                                     */
/* ------------------------------------------------------------------ */

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();

/** Create (once) and resume the context — call from playSound/gesture paths. */
function ensureContext(): AudioContext | null {
  if (!ctx) {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/** Fetch + decode a file once; the promise is cached (concurrent plays share it). */
function loadBuffer(name: SoundName): Promise<AudioBuffer | null> {
  let pending = buffers.get(name);
  if (!pending) {
    pending = (async () => {
      const ac = ensureContext();
      if (!ac) return null;
      const response = await fetch(FILES[name]);
      const data = await response.arrayBuffer();
      return await ac.decodeAudioData(data);
    })().catch(() => null);
    buffers.set(name, pending);
  }
  return pending;
}

/** No WebAudio (ancient browsers): plain <audio> with pitch shifting forced on. */
function playElement(name: SoundName, opts: { pitch?: number; volume?: number }): void {
  const audio = new Audio(FILES[name]);
  audio.preservesPitch = false;
  (audio as { webkitPreservesPitch?: boolean }).webkitPreservesPitch = false;
  audio.volume = opts.volume ?? 0.2;
  if (opts.pitch !== undefined) audio.playbackRate = opts.pitch;
  audio.play().catch(() => {
    /* autoplay blocked before first interaction — ignore */
  });
}

export function playSound(
  name: SoundName,
  opts: { pitch?: number; volume?: number } = {},
): void {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) {
    playElement(name, opts);
    return;
  }
  void loadBuffer(name).then((buffer) => {
    if (!buffer || muted) return; // muted while the file was loading — skip
    const source = ac.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = opts.pitch ?? 1;
    const gain = ac.createGain();
    gain.gain.value = opts.volume ?? 0.2;
    source.connect(gain).connect(ac.destination);
    source.start();
  });
}

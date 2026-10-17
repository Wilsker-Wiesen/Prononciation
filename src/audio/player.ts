/**
 * Kleiner Singleton-Player: Blobs über ein HTMLAudioElement (mit Ausschnitt
 * und Tempo), rohes PCM über einen AudioBufferSourceNode.
 * Neues Abspielen stoppt immer das laufende.
 *
 * iOS: Safari erlaubt Wiedergabe nur aus einer Nutzergeste heraus. Nach einem
 * await (IndexedDB, fetch) ist die Geste verbraucht. Deshalb gibt es genau ein
 * Audio-Element, das bei der ersten Berührung einmal mit Stille entsperrt wird
 * (installAudioUnlock); danach darf es jederzeit abspielen.
 */
import { getAudioContextCtor } from './audioContext';

export interface PlayOptions {
  /** Startposition in Sekunden. */
  start?: number;
  /** Endposition in Sekunden (Ausschnitt). */
  end?: number;
  /** Wiedergabetempo, z. B. 0.75 zum langsamen Hören. */
  rate?: number;
}

interface Playback {
  stop(): void;
}

type ChangeListener = (playing: boolean) => void;

const listeners = new Set<ChangeListener>();
let playing = false;
let current: Playback | null = null;
let ctx: AudioContext | null = null;

/** Abstand vor dem Ende eines Ausschnitts, ab dem gestoppt wird (timeupdate ist grob). */
const END_TOLERANCE_S = 0.02;
const POLL_INTERVAL_MS = 40;

function setPlaying(value: boolean): void {
  if (playing === value) return;
  playing = value;
  for (const cb of listeners) {
    try {
      cb(value);
    } catch {
      /* Zuhörer dürfen die Wiedergabe nicht stören */
    }
  }
}

function getContext(): AudioContext | null {
  if (ctx && ctx.state !== 'closed') return ctx;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function setPreservesPitch(el: HTMLAudioElement): void {
  const anyEl = el as HTMLAudioElement & { preservesPitch?: boolean; webkitPreservesPitch?: boolean };
  if ('preservesPitch' in anyEl) anyEl.preservesPitch = true;
  if ('webkitPreservesPitch' in anyEl) anyEl.webkitPreservesPitch = true;
}

let sharedEl: HTMLAudioElement | null = null;

function audioElement(): HTMLAudioElement {
  sharedEl ??= new Audio();
  return sharedEl;
}

/** 0,05 s Stille als WAV (8 kHz, 8 bit) zum Entsperren unter iOS. */
function silentWavUrl(): string {
  const n = 400;
  const bytes = new Uint8Array(44 + n);
  const v = new DataView(bytes.buffer);
  const str = (o: number, t: string) => { for (let i = 0; i < t.length; i++) bytes[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  str(36, 'data'); v.setUint32(40, n, true); bytes.fill(128, 44);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

/**
 * Bei der ersten Berührung/Taste Audio-Element und AudioContext entsperren
 * (iOS/iPadOS Safari und WKWebView). Einmal beim Start aufrufen.
 */
export function installAudioUnlock(): void {
  if (typeof document === 'undefined' || typeof Audio === 'undefined') return;
  const events = ['touchend', 'pointerdown', 'keydown'] as const;
  const unlock = (): void => {
    for (const e of events) document.removeEventListener(e, unlock, true);
    const el = audioElement();
    if (!current) {
      el.src = silentWavUrl();
      el.play().catch(() => undefined);
    }
    const c = getContext();
    if (c && c.state === 'suspended') c.resume().catch(() => undefined);
  };
  for (const e of events) document.addEventListener(e, unlock, true);
}

function playBlob(blob: Blob, opts: PlayOptions): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof Audio === 'undefined' || typeof URL === 'undefined') {
      reject(new Error('Audiowiedergabe wird nicht unterstützt'));
      return;
    }
    const rate = opts.rate ?? 1;
    const start = Math.max(0, opts.start ?? 0);
    const end = opts.end;
    const url = URL.createObjectURL(blob);
    const el = audioElement();
    el.preload = 'auto';
    setPreservesPitch(el);
    el.defaultPlaybackRate = rate;
    el.playbackRate = rate;

    let done = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let safety: ReturnType<typeof setTimeout> | null = null;

    const finish = (err?: unknown): void => {
      if (done) return;
      done = true;
      if (poll) clearInterval(poll);
      if (safety) clearTimeout(safety);
      el.removeEventListener('timeupdate', checkEnd);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
      el.removeEventListener('loadedmetadata', onMeta);
      try {
        el.pause();
        el.removeAttribute('src');
        el.load(); // Ressourcen freigeben
      } catch {
        /* ignorieren */
      }
      URL.revokeObjectURL(url);
      if (current === handle) current = null;
      setPlaying(false);
      if (err) reject(err instanceof Error ? err : new Error(String(err)));
      else resolve();
    };
    const handle: Playback = { stop: () => finish() };

    const armSafety = (segmentEnd: number): void => {
      if (safety) clearTimeout(safety);
      const ms = (Math.max(0, segmentEnd - start) / rate) * 1000 + 750;
      safety = setTimeout(() => finish(), ms);
    };
    const checkEnd = (): void => {
      if (end !== undefined && el.currentTime >= end - END_TOLERANCE_S) finish();
    };
    const onEnded = (): void => finish();
    const onError = (): void => finish(new Error('Audiodatei konnte nicht abgespielt werden'));
    const onMeta = (): void => {
      // Startposition ggf. nachziehen (vor den Metadaten greift der Seek nicht überall)
      if (start > 0 && Math.abs(el.currentTime - start) > 0.05) {
        try {
          el.currentTime = start;
        } catch {
          /* ignorieren */
        }
      }
      if (end === undefined && Number.isFinite(el.duration)) armSafety(el.duration);
    };

    el.addEventListener('timeupdate', checkEnd);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);
    el.addEventListener('loadedmetadata', onMeta);

    current = handle;
    setPlaying(true);
    el.src = url;
    if (start > 0) {
      try {
        el.currentTime = start; // Standard: wird als Startposition gemerkt
      } catch {
        /* wird in onMeta erneut versucht */
      }
    }
    if (end !== undefined) armSafety(end);

    // play() synchron aufrufen – wichtig für die Nutzergeste in Safari
    const p = el.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        if (!done) poll = setInterval(checkEnd, POLL_INTERVAL_MS);
      }).catch((err: unknown) => finish(err));
    } else {
      poll = setInterval(checkEnd, POLL_INTERVAL_MS);
    }
  });
}

function playBuffer(pcm: Float32Array, sampleRate: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const audioCtx = getContext();
    if (!audioCtx) {
      reject(new Error('Web Audio wird nicht unterstützt'));
      return;
    }
    if (pcm.length === 0) {
      resolve();
      return;
    }
    if (audioCtx.state !== 'running') void audioCtx.resume().catch(() => undefined);

    const buffer = audioCtx.createBuffer(1, pcm.length, sampleRate);
    buffer.getChannelData(0).set(pcm);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    let done = false;
    let safety: ReturnType<typeof setTimeout> | null = null;
    const finish = (): void => {
      if (done) return;
      done = true;
      if (safety) clearTimeout(safety);
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* schon beendet */
      }
      try {
        source.disconnect();
      } catch {
        /* ignorieren */
      }
      if (current === handle) current = null;
      setPlaying(false);
      resolve();
    };
    const handle: Playback = { stop: finish };

    current = handle;
    setPlaying(true);
    source.onended = finish;
    safety = setTimeout(finish, (pcm.length / sampleRate) * 1000 + 750);
    try {
      source.start();
    } catch (err) {
      finish();
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export const player = {
  /** Spielt einen Blob (mp3, wav …); optional Ausschnitt und Tempo. */
  play(blob: Blob, opts: PlayOptions = {}): Promise<void> {
    player.stop();
    return playBlob(blob, opts);
  },

  /** Spielt rohes Float32-PCM (z. B. die eigene Aufnahme). */
  playPcm(pcm: Float32Array, sampleRate: number): Promise<void> {
    player.stop();
    return playBuffer(pcm, sampleRate);
  },

  /** Stoppt die laufende Wiedergabe; das zugehörige Promise wird erfüllt (kein Fehler). */
  stop(): void {
    const c = current;
    current = null;
    c?.stop();
    setPlaying(false);
  },

  get isPlaying(): boolean {
    return playing;
  },

  /** Meldet Start/Stopp; liefert eine Abmeldefunktion. */
  onChange(cb: ChangeListener): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
};

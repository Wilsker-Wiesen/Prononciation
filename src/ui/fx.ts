/**
 * Effekte: Konfetti, Töne (Web Audio, ohne Audiodateien) und Vibration.
 * Respektiert „Bewegung reduzieren“ des Systems und die Ton-Einstellung.
 */

let soundOn = true;
export function setSoundEnabled(on: boolean): void {
  soundOn = on;
}

function reducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

let ctx: AudioContext | null = null;
function audio(): AudioContext | null {
  if (!soundOn || typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(ac.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

export const sfx = {
  /** gutes Ergebnis */
  success(): void {
    tone(660, 0, 0.12, 'triangle');
    tone(990, 0.09, 0.18, 'triangle');
  },
  /** sehr gutes Ergebnis / Kombo */
  combo(): void {
    tone(660, 0, 0.1, 'triangle');
    tone(880, 0.08, 0.1, 'triangle');
    tone(1320, 0.16, 0.22, 'triangle');
  },
  /** sanfter Hinweis (kein „Fehlerton“) */
  soft(): void {
    tone(440, 0, 0.16, 'sine', 0.08);
  },
  /** Tagesziel / Quest / Abzeichen */
  fanfare(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'triangle', 0.1));
  },
  tap(): void {
    tone(880, 0, 0.05, 'square', 0.04);
  },
};

export function vibrate(pattern: number | number[]): void {
  if (!soundOn) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // nicht unterstützt
  }
}

/** Konfetti in Bleu-Blanc-Rouge (und Gold) über die ganze Seite. */
export function confetti(pieces = 70): void {
  if (typeof document === 'undefined' || reducedMotion()) return;
  const host = document.createElement('div');
  host.className = 'confetti';
  host.setAttribute('aria-hidden', 'true');
  const colors = ['#2b59c3', '#ffffff', '#e63946', '#e8b84a'];
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('span');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = colors[i % colors.length]!;
    p.style.animationDelay = `${Math.random() * 0.4}s`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    p.style.width = `${6 + Math.random() * 6}px`;
    p.style.height = `${8 + Math.random() * 10}px`;
    host.appendChild(p);
  }
  document.body.appendChild(host);
  setTimeout(() => host.remove(), 3500);
}

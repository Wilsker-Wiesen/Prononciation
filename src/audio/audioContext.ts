/**
 * Zugriff auf den AudioContext-Konstruktor (inkl. webkit-Präfix für ältere Safari-Versionen).
 * Liefert null, wenn keine Web-Audio-API vorhanden ist (z. B. in Node/Tests).
 */

type AudioContextCtor = typeof AudioContext;

export function getAudioContextCtor(): AudioContextCtor | null {
  const g = globalThis as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return g.AudioContext ?? g.webkitAudioContext ?? null;
}

export function hasWebAudio(): boolean {
  return getAudioContextCtor() !== null;
}

/**
 * Audio Session API (Safari 16.4+, iOS-WebView): steuert, wie iOS den Ton behandelt.
 * „playback“ spielt auch bei eingeschaltetem Stummschalter und über den Lautsprecher;
 * während der Aufnahme ist „play-and-record“ nötig. Andere Browser ignorieren das.
 */
type SessionType = 'auto' | 'playback' | 'play-and-record';

export function setAudioSession(type: SessionType): void {
  const s = (globalThis.navigator as Navigator & { audioSession?: { type: string } } | undefined)?.audioSession;
  if (!s) return;
  try {
    s.type = type;
  } catch {
    /* nicht unterstützt */
  }
}

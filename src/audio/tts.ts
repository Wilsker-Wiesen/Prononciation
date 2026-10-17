/**
 * Sprachausgabe über die Web Speech API (speechSynthesis) als Rückfall,
 * wenn zu einem Eintrag keine Audiodatei vorliegt.
 *
 * Hinweis: Das Audio der Systemstimme lässt sich nicht als PCM abgreifen –
 * es taugt daher nur zum Vorsprechen, nicht als Referenz für den Vergleich.
 * Welche Stimmen vorhanden sind, hängt vom Gerät ab (iPad: meist "Thomas",
 * "Amélie"; Android: Google-TTS, ggf. muss Französisch nachinstalliert werden).
 */

export interface SpeakOptions {
  /** Sprechtempo (Standard 0.9 – etwas langsamer als normal). */
  rate?: number;
  /** Bevorzugte Stimme (SpeechSynthesisVoice.name). */
  voiceName?: string;
}

const VOICES_TIMEOUT_MS = 1500;

let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;
/** Referenz auf die laufende Äußerung – Chrome bricht sonst bei GC ohne onend ab. */
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function ttsAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Alle Stimmen, deren Sprache mit "fr" beginnt (fr-FR, fr-CA, fr_FR …). */
export function frenchVoices(): SpeechSynthesisVoice[] {
  if (!ttsAvailable()) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
}

/**
 * Wartet bei Bedarf auf das voiceschanged-Ereignis (Chrome liefert die Liste
 * erst asynchron). Nach einem Timeout wird die aktuelle Liste geliefert.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsAvailable()) return Promise.resolve([]);
  const now = speechSynthesis.getVoices();
  if (now.length > 0) return Promise.resolve(now);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      speechSynthesis.removeEventListener('voiceschanged', done);
      const voices = speechSynthesis.getVoices();
      if (voices.length === 0) voicesPromise = null; // beim nächsten Mal erneut versuchen
      resolve(voices);
    };
    const timer = setTimeout(done, VOICES_TIMEOUT_MS);
    speechSynthesis.addEventListener('voiceschanged', done);
  });
  return voicesPromise;
}

/**
 * Qualitätsrangfolge der Gerätestimmen (Heuristik über Namen): neuronale
 * Online-Stimmen (Edge „Natural“), Apple „Premium“/„Erweitert“, Google, dann
 * einfache Systemstimmen; Frankreich-Französisch vor Varietäten aus Kanada.
 */
export function voiceQuality(v: Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService'>): number {
  const n = v.name.toLowerCase();
  const lang = v.lang.toLowerCase().replace('_', '-');
  let q = 0;
  if (/natural|neural|online/.test(n)) q += 50;
  if (/premium/.test(n)) q += 40;
  if (/enhanced|erweitert|améliorée|amelioree|siri/.test(n)) q += 30;
  if (/google/.test(n)) q += 20;
  if (/espeak|compact/.test(n)) q -= 40;
  if (lang === 'fr-fr' || lang === 'fr') q += 15;
  else if (lang !== 'fr-ca') q += 5;
  if (v.localService) q += 2;
  return q;
}

/** Französische Stimmen, beste zuerst. */
export function rankedFrenchVoices(): SpeechSynthesisVoice[] {
  return [...frenchVoices()].sort((a, b) => voiceQuality(b) - voiceQuality(a));
}

function pickVoice(voices: SpeechSynthesisVoice[], voiceName?: string): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  if (voiceName) {
    const named = voices.find((v) => v.name === voiceName);
    if (named) return named;
  }
  return [...voices].sort((a, b) => voiceQuality(b) - voiceQuality(a))[0] ?? null;
}

/** Bricht eine laufende Sprachausgabe ab. */
export function cancelSpeech(): void {
  if (!ttsAvailable()) return;
  currentUtterance = null;
  speechSynthesis.cancel();
}

/**
 * Spricht `text` mit einer französischen Stimme. Eine laufende Ausgabe wird
 * abgebrochen. Verwirft das Promise, wenn keine französische Stimme vorhanden ist.
 */
export function speakFrench(text: string, opts: SpeakOptions = {}): Promise<void> {
  if (!ttsAvailable()) return Promise.reject(new Error('Sprachausgabe wird nicht unterstützt'));
  cancelSpeech();
  return loadVoices().then(
    () =>
      new Promise<void>((resolve, reject) => {
        const voice = pickVoice(frenchVoices(), opts.voiceName);
        if (!voice) {
          reject(new Error('Keine französische Stimme installiert'));
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = opts.rate ?? 0.9;
        utterance.onend = () => {
          if (currentUtterance === utterance) currentUtterance = null;
          resolve();
        };
        utterance.onerror = (e) => {
          if (currentUtterance === utterance) currentUtterance = null;
          // Abbruch durch cancel() ist kein Fehler
          if (e.error === 'interrupted' || e.error === 'canceled') resolve();
          else reject(new Error(`Sprachausgabe fehlgeschlagen: ${e.error}`));
        };
        currentUtterance = utterance;
        speechSynthesis.speak(utterance);
      }),
  );
}

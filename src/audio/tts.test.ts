import { describe, expect, it } from 'vitest';
import { voiceQuality } from './tts';
import { normalizeTtsText, ttsKey } from './ttsKey';

const v = (name: string, lang = 'fr-FR', localService = true) => ({ name, lang, localService });

describe('Gerätestimmen', () => {
  it('bevorzugt neuronale und erweiterte Stimmen aus Frankreich', () => {
    const ranked = [v('Thomas'), v('Amélie', 'fr-CA'), v('Microsoft Denise Online (Natural) - French (France)', 'fr-FR', false), v('Audrey (Premium)'), v('Google français', 'fr-FR', false), v('eSpeak French')]
      .sort((a, b) => voiceQuality(b) - voiceQuality(a))
      .map((x) => x.name);
    expect(ranked[0]).toMatch(/Denise/);
    expect(ranked[1]).toMatch(/Premium/);
    expect(ranked[2]).toMatch(/Google/);
    expect(ranked.at(-1)).toMatch(/eSpeak/);
    expect(ranked.indexOf('Thomas')).toBeLessThan(ranked.indexOf('Amélie'));
  });
});

describe('Schlüssel der Vorbild-Aufnahmen', () => {
  it('ist unabhängig von Apostroph-Variante und Leerraum', () => {
    expect(ttsKey('J’habite à Münster.')).toBe(ttsKey("J'habite  à Münster."));
    expect(normalizeTtsText('Je m’appelle …')).toBe("Je m'appelle");
    expect(ttsKey('il parle')).not.toBe(ttsKey('ils parlent'));
    expect(ttsKey('bonjour')).toMatch(/^[0-9a-f]{8}$/);
  });
});

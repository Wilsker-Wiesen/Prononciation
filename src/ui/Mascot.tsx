/**
 * Coco le coq – das Maskottchen der App (gallischer Hahn in Blau-Weiß-Rot).
 * Reines SVG, Stimmungen und Outfits als Überlagerungen.
 */
import type { ReactNode } from 'react';

export type Mood = 'happy' | 'cheer' | 'neutral' | 'think' | 'encourage' | 'sleep';

export function Mascot({ mood = 'happy', outfit = '', size = 96, title }: { mood?: Mood; outfit?: string; size?: number; title?: string }) {
  const eyes = (() => {
    switch (mood) {
      case 'happy':
      case 'cheer':
        return (
          <g stroke="#1d2430" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M48 44 q4 -5 8 0" />
            <path d="M66 44 q4 -5 8 0" />
          </g>
        );
      case 'sleep':
        return (
          <g stroke="#1d2430" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M48 45 h8" />
            <path d="M66 45 h8" />
          </g>
        );
      case 'think':
        return (
          <g>
            <circle cx="52" cy="44" r="6" fill="#fff" />
            <circle cx="70" cy="44" r="6" fill="#fff" />
            <circle cx="54" cy="41" r="3" fill="#1d2430" />
            <circle cx="72" cy="41" r="3" fill="#1d2430" />
          </g>
        );
      case 'encourage':
        return (
          <g>
            <circle cx="52" cy="45" r="6" fill="#fff" />
            <circle cx="70" cy="45" r="6" fill="#fff" />
            <circle cx="52" cy="46" r="3" fill="#1d2430" />
            <circle cx="70" cy="46" r="3" fill="#1d2430" />
            <path d="M46 36 l10 3 M76 36 l-10 3" stroke="#1d2430" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        );
      default:
        return (
          <g>
            <circle cx="52" cy="45" r="6" fill="#fff" />
            <circle cx="70" cy="45" r="6" fill="#fff" />
            <circle cx="53" cy="46" r="3" fill="#1d2430" />
            <circle cx="71" cy="46" r="3" fill="#1d2430" />
          </g>
        );
    }
  })();
  const beakOpen = mood === 'cheer';
  const wingsUp = mood === 'cheer';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={title ?? 'Coco, der Hahn'} style={{ flexShrink: 0, overflow: 'visible' }}>
      {/* Schwanzfedern Bleu-Blanc-Rouge */}
      <g transform="translate(88 62)">
        <path d="M0 0 C 18 -18, 26 -30, 20 -44 C 12 -30, 4 -20, -4 -10 Z" fill="#2b59c3" />
        <path d="M0 4 C 22 -6, 32 -14, 32 -28 C 20 -16, 8 -8, -2 -2 Z" fill="#f7f5f0" stroke="#d9d4c7" strokeWidth="1" />
        <path d="M0 8 C 22 6, 32 0, 36 -12 C 22 -4, 10 0, -2 4 Z" fill="#e63946" />
      </g>
      {/* Körper */}
      <ellipse cx="60" cy="72" rx="34" ry="32" fill="#2b59c3" />
      <ellipse cx="60" cy="80" rx="22" ry="20" fill="#f7f5f0" />
      {outfit === 'mariniere' && (
        <g clipPath="url(#belly)">
          <defs>
            <clipPath id="belly"><ellipse cx="60" cy="80" rx="22" ry="20" /></clipPath>
          </defs>
          {[64, 71, 78, 85, 92].map((y) => <rect key={y} x="36" y={y} width="48" height="3" fill="#1f3a8a" />)}
        </g>
      )}
      {/* Flügel */}
      <path d={wingsUp ? 'M28 66 C 10 52, 8 40, 16 34 C 22 46, 30 54, 36 60 Z' : 'M28 70 C 18 78, 18 92, 30 96 C 30 86, 32 78, 36 72 Z'} fill="#1f4e9a" />
      <path d={wingsUp ? 'M92 66 C 110 52, 112 40, 104 34 C 98 46, 90 54, 84 60 Z' : 'M92 70 C 102 78, 102 92, 90 96 C 90 86, 88 78, 84 72 Z'} fill="#1f4e9a" />
      {outfit === 'baguette' && <rect x="88" y="60" width="10" height="44" rx="5" transform="rotate(25 93 82)" fill="#e0b46c" stroke="#b5874a" strokeWidth="1.5" />}
      {/* Kopf */}
      <circle cx="61" cy="46" r="24" fill="#2b59c3" />
      {/* Kamm */}
      {outfit !== 'beret' && outfit !== 'crown' && (
        <path d="M48 26 c -2 -10, 8 -12, 9 -4 c 1 -10, 12 -10, 11 0 c 3 -8, 12 -4, 8 4 Z" fill="#e63946" />
      )}
      {eyes}
      {/* Schnabel */}
      {beakOpen ? (
        <g>
          <path d="M57 52 L68 52 L62 58 Z" fill="#f4b400" />
          <path d="M57 56 L68 56 L62 64 Z" fill="#e09a00" />
        </g>
      ) : (
        <path d="M56 52 L68 52 L62 60 Z" fill="#f4b400" />
      )}
      {/* Kehllappen */}
      <path d="M60 60 c -4 6, 2 10, 4 4 Z" fill="#e63946" />
      {/* Beine */}
      <path d="M50 102 v8 M70 102 v8 M46 110 h8 M66 110 h8" stroke="#f4b400" strokeWidth="3" strokeLinecap="round" />
      {/* Outfits */}
      {outfit === 'beret' && <path d="M40 30 C 42 16, 74 12, 84 24 C 78 28, 52 30, 40 30 Z M62 14 l2 -5" fill="#1d2430" stroke="#1d2430" strokeWidth="2" />}
      {outfit === 'crown' && <path d="M44 28 L46 12 L54 22 L61 8 L68 22 L76 12 L78 28 Z" fill="#e8b84a" stroke="#b8862a" strokeWidth="1.5" />}
      {outfit === 'sunglasses' && (
        <g>
          <rect x="44" y="40" width="15" height="10" rx="3" fill="#1d2430" />
          <rect x="63" y="40" width="15" height="10" rx="3" fill="#1d2430" />
          <path d="M59 44 h4" stroke="#1d2430" strokeWidth="2" />
        </g>
      )}
      {outfit === 'echarpe' && (
        <g>
          <path d="M38 62 q22 10 46 0 v6 q-23 10 -46 0 Z" fill="#e63946" />
          <path d="M38 62 q8 4 15 5 v6 q-7 -1 -15 -5 Z" fill="#2b59c3" />
          <path d="M53 67 q8 1 16 0 v6 q-8 1 -16 0 Z" fill="#f7f5f0" />
          <path d="M72 66 l4 18 l6 -2 l-4 -17 Z" fill="#e63946" />
        </g>
      )}
      {outfit === 'headphones' && (
        <g fill="none" stroke="#1d2430" strokeWidth="4">
          <path d="M38 46 C 38 18, 84 18, 84 46" />
          <rect x="33" y="42" width="9" height="14" rx="3" fill="#e63946" stroke="none" />
          <rect x="80" y="42" width="9" height="14" rx="3" fill="#e63946" stroke="none" />
        </g>
      )}
      {mood === 'sleep' && <text x="84" y="22" fontSize="14" fill="#5d6675">z z</text>}
    </svg>
  );
}

export function SpeechBubble({ children }: { children: ReactNode }) {
  return <div className="bubble">{children}</div>;
}

export function MascotSays({ mood, outfit, fr, de, size = 72 }: { mood: Mood; outfit?: string; fr: string; de?: string; size?: number }) {
  return (
    <div className="mascot-says">
      <Mascot mood={mood} outfit={outfit} size={size} />
      <SpeechBubble>
        <b>{fr}</b>
        {de && <span className="muted small"> {de}</span>}
      </SpeechBubble>
    </div>
  );
}

// ---------- Sprüche ----------

type Line = { fr: string; de: string };

const LINES: Record<string, Line[]> = {
  excellent: [
    { fr: 'Magnifique !', de: 'Großartig!' },
    { fr: 'Trop fort !', de: 'Echt stark!' },
    { fr: 'On dirait un vrai Parisien !', de: 'Klingt wie aus Paris!' },
    { fr: 'Parfait, rien à dire.', de: 'Perfekt, nichts zu meckern.' },
    { fr: 'Tu gères !', de: 'Du hast’s drauf!' },
  ],
  good: [
    { fr: 'Très bien !', de: 'Sehr gut!' },
    { fr: 'Pas mal du tout !', de: 'Gar nicht schlecht!' },
    { fr: 'Bien joué !', de: 'Gut gemacht!' },
    { fr: 'Ça avance !', de: 'Es geht voran!' },
  ],
  mid: [
    { fr: 'Presque !', de: 'Fast!' },
    { fr: 'On y est presque.', de: 'Wir sind fast da.' },
    { fr: 'Encore une petite fois ?', de: 'Noch einmal?' },
  ],
  low: [
    { fr: 'Courage !', de: 'Kopf hoch!' },
    { fr: 'Même moi, j’ai dû m’entraîner.', de: 'Auch ich musste üben.' },
    { fr: 'Écoute encore une fois, puis essaie.', de: 'Hör nochmal hin, dann probier’s.' },
  ],
  combo: [
    { fr: 'Combo ! Continue !', de: 'Kombo! Weiter so!' },
    { fr: 'Tu es en feu !', de: 'Du bist on fire!' },
  ],
  goal: [
    { fr: 'Objectif du jour atteint !', de: 'Tagesziel geschafft!' },
  ],
  welcome: [
    { fr: 'Salut ! On s’entraîne ?', de: 'Hi! Wollen wir üben?' },
    { fr: 'Coucou ! Prêt·e pour quelques mots ?', de: 'Hallo! Bereit für ein paar Wörter?' },
    { fr: 'Bonjour ! Ta voix m’a manqué.', de: 'Hallo! Deine Stimme hat mir gefehlt.' },
  ],
  welcomeStreak: [
    { fr: 'Ta série continue, bravo !', de: 'Deine Serie läuft, super!' },
  ],
  welcomeDone: [
    { fr: 'Objectif atteint ! Encore un peu ?', de: 'Ziel erreicht! Noch ein bisschen?' },
  ],
};

export function pickLine(kind: keyof typeof LINES, seed = Math.random()): Line {
  const arr = LINES[kind]!;
  return arr[Math.floor(seed * arr.length) % arr.length]!;
}

export function lineForScore(score: number, seed?: number): { mood: Mood; line: Line } {
  if (score >= 95) return { mood: 'cheer', line: pickLine('excellent', seed) };
  if (score >= 85) return { mood: 'happy', line: pickLine('good', seed) };
  if (score >= 65) return { mood: 'think', line: pickLine('mid', seed) };
  return { mood: 'encourage', line: pickLine('low', seed) };
}

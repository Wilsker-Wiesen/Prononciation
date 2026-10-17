/** Kleine, wiederverwendbare Bausteine der Oberfläche. */
import { useEffect, useRef, type ReactNode } from 'react';
import type { Finding } from '../asr/diagnostics';
import { band, type WordResult } from '../asr/score';
import { waveformPeaks } from '../audio/levels';
import { PHONES } from '../phon/ipa';

export const Icon = {
  play: () => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>),
  slow: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>),
  mic: () => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11z" /></svg>),
  stop: () => (<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>),
  next: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>),
  prev: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>),
  retry: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v5h5" /></svg>),
  ear: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M6 10a6 6 0 0 1 12 0c0 3-2 4-3 6s-1 4-4 4" /><path d="M9 10a3 3 0 0 1 6 0" /></svg>),
  check: () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>),
};

export function ScoreRing({ score, label }: { score: number; label?: string }) {
  return (
    <div className={`score-ring ${band(score)}`} aria-label={`${label ?? 'Punkte'}: ${score}`}>
      <span>{score}</span>
      {label && <small>{label}</small>}
    </div>
  );
}

export function Badge({ score, children }: { score?: number; children?: ReactNode }) {
  const cls = score === undefined ? '' : band(score);
  return <span className={`badge ${cls}`}>{children ?? score}</span>;
}

/** Zeichnet eine Wellenform aus PCM-Daten. */
export function Waveform({ pcm, color }: { pcm: Float32Array | null; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || 300;
    const h = c.clientHeight || 64;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    if (!pcm || pcm.length === 0) return;
    const buckets = Math.max(20, Math.floor(w / 3));
    const peaks = waveformPeaks(pcm, buckets);
    const bw = w / buckets;
    ctx.fillStyle = color ?? (getComputedStyle(c).getPropertyValue('--primary').trim() || '#1f4e79');
    for (let i = 0; i < buckets; i++) {
      const p = Math.min(1, peaks[i] ?? 0);
      const bh = Math.max(2, p * (h - 4));
      ctx.fillRect(i * bw + 0.5, (h - bh) / 2, Math.max(1, bw - 1.5), bh);
    }
  }, [pcm, color]);
  return <canvas ref={ref} className="wave" aria-hidden="true" />;
}

/** Text mit farbig markierten Buchstaben je nach Phonbewertung. */
export function HighlightedText({ text, words }: { text: string; words: WordResult[] | null }) {
  if (!words) return <div className="trainer-text">{text}</div>;
  const classes = new Array<string>(text.length).fill('');
  for (const w of words) {
    for (const p of w.phones) {
      if (p.status === 'skipped' || p.liaison) continue;
      const cls = p.status === 'ok' ? 'ok' : p.status === 'weak' ? 'weak' : p.status;
      for (let i = p.start; i < Math.min(p.end, text.length); i++) {
        // schlechteste Bewertung je Buchstabe gewinnt
        const cur = classes[i]!;
        const rank = (c: string) => (c === 'sub' || c === 'missing' ? 3 : c === 'weak' ? 2 : c === 'ok' ? 1 : 0);
        if (rank(cls) > rank(cur)) classes[i] = cls;
      }
    }
  }
  const spans: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const cls = classes[i]!;
    let j = i + 1;
    while (j < text.length && classes[j] === cls) j++;
    spans.push(cls ? <span key={i} className={cls}>{text.slice(i, j)}</span> : <span key={i}>{text.slice(i, j)}</span>);
    i = j;
  }
  return <div className="trainer-text">{spans}</div>;
}

/** Phonreihe mit Bewertung und gehörtem Laut. */
export function PhoneRow({ words }: { words: WordResult[] }) {
  return (
    <div className="phone-row" aria-label="Laute">
      {words.map((w, wi) => (
        <span key={wi} className="row" style={{ gap: 4 }}>
          {w.phones.filter((p) => !p.optional || p.status !== 'skipped').map((p, pi) => (
            <span key={pi} className={`phone ${p.status}${p.liaison ? ' liaison' : ''}`} title={`${PHONES[p.ipa]?.label ?? p.ipa}${p.heard && p.heard !== p.ipa ? ` – gehört: ${p.heard}` : ''}`}>
              {p.ipa}
              <small>{p.status === 'missing' ? 'fehlt' : p.heard && p.heard !== p.ipa ? p.heard : p.status === 'ok' ? '✓' : p.status === 'weak' ? '~' : ''}</small>
            </span>
          ))}
          {wi < words.length - 1 && <span className="word-gap" />}
        </span>
      ))}
    </div>
  );
}

export function FindingsList({ findings }: { findings: Finding[] }) {
  if (!findings.length) return null;
  return (
    <div className="stack">
      {findings.slice(0, 4).map((f, i) => (
        <div key={i} className={`finding sev${f.severity}`}>
          <h4>{f.title}</h4>
          <p>{f.message}</p>
          <p className="tip">{f.tip}</p>
        </div>
      ))}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return <span className="muted">{label ?? 'Bitte warten …'}</span>;
}

export function formatBytes(n: number): string {
  if (n > 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n > 1e6) return `${(n / 1e6).toFixed(0)} MB`;
  if (n > 1e3) return `${(n / 1e3).toFixed(0)} kB`;
  return `${n} B`;
}

/** Fortschrittsring (z. B. Tagesziel). */
export function GoalRing({ value, max, label }: { value: number; max: number; label?: string }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, max ? value / max : 0));
  return (
    <div className="ring" aria-label={`${label ?? 'Tagesziel'}: ${value} von ${max} XP`}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        <circle cx="42" cy="42" r={r} fill="none" stroke={frac >= 1 ? 'var(--good)' : 'var(--accent)'} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} />
      </svg>
      <div className="ring-label"><span>{Math.min(value, 999)}<br /><small>/ {max} XP</small></span></div>
    </div>
  );
}

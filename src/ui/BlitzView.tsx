/** Ohren-Blitz: 60 Sekunden Hörquiz mit Minimalpaaren aller Phänomene. */
import { useEffect, useRef, useState } from 'react';
import { loadBuiltinManifest } from '../audio/builtinAudio';
import { playText } from '../audio/modelVoice';
import { ttsAvailable } from '../audio/tts';
import { recordBlitz } from '../game/store';
import { BADGES } from '../game/rewards';
import { PHENOMENA, type MinimalPair } from '../phon/phenomena';
import { navigate, useApp } from '../state/appState';
import { Icon } from './components';
import { confetti, sfx, vibrate } from './fx';
import { MascotSays } from './Mascot';
import { useGame } from './MissionsView';

const DURATION = 60;

interface Q { pair: MinimalPair; correct: 0 | 1; emoji: string }

/** Falsch beantwortete Frage: gespielt wurde pair[correct], getippt pair[chosen]. */
interface Miss extends Q { chosen: 0 | 1 }

const pairKey = (p: MinimalPair) => `${p.a}|${p.b}`;
/** Fehlerrunde: dieselben Paare, gespieltes Wort neu ausgelost. */
const reroll = (m: Q): Q => ({ pair: m.pair, emoji: m.emoji, correct: Math.random() < 0.5 ? 0 : 1 });

function makeQuestions(): Q[] {
  const all: Q[] = [];
  for (const ph of PHENOMENA) {
    for (const pair of ph.pairs) {
      if (pair.ipaA.replace(/\s|‿/g, '') === pair.ipaB.replace(/\s|‿/g, '')) continue; // gleich klingend: nicht entscheidbar
      all.push({ pair, correct: Math.random() < 0.5 ? 0 : 1, emoji: ph.emoji });
    }
  }
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j]!, all[i]!]; }
  return all;
}

export function BlitzView() {
  const { settings } = useApp();
  const game = useGame();
  const [questions] = useState<Q[]>(() => makeQuestions());
  const [phase, setPhase] = useState<'ready' | 'run' | 'done' | 'review' | 'reviewed'>('ready');
  const [misses, setMisses] = useState<Miss[]>([]);
  const [review, setReview] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [result, setResult] = useState<null | { xp: number; newBest: boolean; badges: string[] }>(null);
  const timer = useRef<number | null>(null);
  const q = phase === 'review' && review[0] ? review[0] : questions[idx % questions.length]!;
  const word = q.correct === 0 ? q.pair.a : q.pair.b;
  const [hasBuiltin, setHasBuiltin] = useState(false);
  const canSpeak = hasBuiltin || (ttsAvailable() && settings.ttsFallback);
  const say = (text: string, rate = 1) => void playText(text, { rate, ttsFallback: settings.ttsFallback, voiceName: settings.ttsVoice || undefined }).catch(() => undefined);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  useEffect(() => { void loadBuiltinManifest().then((m) => setHasBuiltin(!!m)); }, []);

  const correctRef = useRef(0);

  const finishRound = () => {
    setPhase('done');
    recordBlitz(correctRef.current).then((r) => {
      setResult({ xp: r.xp, newBest: r.newBest, badges: r.newBadges });
      sfx.fanfare();
      if (r.newBest || correctRef.current >= 10) confetti();
    });
  };

  const start = () => {
    setPhase('run');
    setLeft(DURATION);
    correctRef.current = 0;
    let remaining = DURATION;
    timer.current = window.setInterval(() => {
      remaining -= 1;
      setLeft(remaining);
      if (remaining <= 0) {
        if (timer.current) clearInterval(timer.current);
        finishRound();
      }
    }, 1000);
    say(word);
  };

  const startReview = () => {
    const queue = misses.map(reroll);
    setReview(queue);
    setPhase('review');
    const first = queue[0];
    if (first) say(first.correct === 0 ? first.pair.a : first.pair.b);
  };

  const answerReview = (i: 0 | 1) => {
    const ok = i === q.correct;
    setFeedback(ok);
    if (ok) sfx.success(); else { sfx.soft(); vibrate(20); }
    setTimeout(() => {
      setFeedback(null);
      // richtig: Paar ist geschafft; falsch: hinten wieder anstellen
      const rest = ok ? review.slice(1) : [...review.slice(1), reroll(q)];
      setReview(rest);
      const next = rest[0];
      if (!next) { setPhase('reviewed'); sfx.fanfare(); return; }
      say(next.correct === 0 ? next.pair.a : next.pair.b);
    }, ok ? 450 : 1300);
  };

  const answer = (i: 0 | 1) => {
    if (feedback !== null) return;
    if (phase === 'review') { answerReview(i); return; }
    if (phase !== 'run') return;
    const ok = i === q.correct;
    if (!ok) setMisses((m) => (m.some((x) => pairKey(x.pair) === pairKey(q.pair)) ? m : [...m, { ...q, chosen: i }]));
    setFeedback(ok);
    if (ok) { correctRef.current += 1; setCorrect((c) => c + 1); setCombo((c) => c + 1); if (combo + 1 >= 3) sfx.combo(); else sfx.success(); }
    else { setCombo(0); sfx.soft(); vibrate(20); }
    setTimeout(() => {
      setFeedback(null);
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      const nq = questions[nextIdx % questions.length]!;
      say(nq.correct === 0 ? nq.pair.a : nq.pair.b);
    }, ok ? 450 : 1100);
  };

  if (!canSpeak) {
    return (
      <div className="card">
        <h1>⚡ Ohren-Blitz</h1>
        <p>Für den Ohren-Blitz braucht dein Gerät eine französische Stimme (Sprachausgabe). Sie ist hier nicht verfügbar oder in den Einstellungen ausgeschaltet.</p>
        <button className="btn" onClick={() => navigate({ name: 'home' })}>Zurück</button>
      </div>
    );
  }

  if (phase === 'ready') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>⚡ Ohren-Blitz</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood="happy" fr="60 secondes. Prêt·e ?" de="60 Sekunden. Bereit?" />
        </div>
        <p>Du hörst ein Wort und tippst, welches es war. So viele wie möglich in 60 Sekunden.</p>
        <p className="muted small">Dein Rekord: {game.bestBlitz} richtige Antworten</p>
        <button className="btn primary big" onClick={start}>Los!</button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>{result?.newBest ? 'Nouveau record !' : 'Temps écoulé !'}</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood={result?.newBest ? 'cheer' : 'happy'} fr={result?.newBest ? 'Record battu !' : 'Bien joué !'} de={`${correct} richtige Antworten`} />
        </div>
        {result && (
          <div className="row" style={{ justifyContent: 'center' }}>
            <span className="badge good reward-pop">+{result.xp} XP</span>
            {result.newBest && <span className="badge combo-badge reward-pop">🏆 Neuer Rekord</span>}
            {result.badges.map((b) => { const d = BADGES.find((x) => x.id === b); return d ? <span key={b} className="badge reward-pop">{d.emoji} {d.title}</span> : null; })}
          </div>
        )}
        {misses.length > 0 && <MissList misses={misses} say={say} onReview={startReview} />}
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={() => navigate({ name: 'home' })}>Zur Startseite</button>
          <button className="btn primary" onClick={() => { location.hash = '#/'; setTimeout(() => navigate({ name: 'blitz' }), 0); }}><Icon.retry /> Nochmal</button>
        </div>
      </div>
    );
  }

  if (phase === 'reviewed') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>Bravo !</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood="cheer" fr="Tout est juste maintenant !" de="Jetzt sitzt alles!" />
        </div>
        <MissList misses={misses} say={say} />
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={() => navigate({ name: 'home' })}>Zur Startseite</button>
          <button className="btn primary" onClick={() => { location.hash = '#/'; setTimeout(() => navigate({ name: 'blitz' }), 0); }}><Icon.retry /> Neue Runde</button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="row between">
        {phase === 'review'
          ? <span className="chip">🔁 Fehlerrunde · noch {review.length}</span>
          : <span className={`blitz-timer${left <= 10 ? ' low' : ''}`}>⏱ {left}s</span>}
        <span className="hud"><span className="chip">✅ {correct}</span>{combo >= 2 && <span className="chip combo-badge">⚡ ×{combo}</span>}</span>
      </div>
      <div style={{ textAlign: 'center', margin: '14px 0' }}>
        <button className="btn big" onClick={() => say(word, 0.8)}><Icon.play /> Nochmal hören</button>
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
        {[q.pair.a, q.pair.b].map((text, i) => {
          const state = feedback === null ? '' : i === q.correct ? 'primary' : '';
          return (
            <button key={i} className={`btn big ${state}`} style={{ minWidth: 140, ...(feedback === false && i !== q.correct ? { borderColor: 'var(--bad)', color: 'var(--bad)' } : {}) }} onClick={() => answer(i as 0 | 1)}>
              {text}
            </button>
          );
        })}
      </div>
      <p className="muted small" style={{ textAlign: 'center', marginTop: 10 }}>{q.emoji} {feedback === false ? `Es war „${word}“ [${q.correct === 0 ? q.pair.ipaA : q.pair.ipaB}]` : ' '}</p>
    </div>
  );
}

/** Liste der Verwechslungen: beide Wörter zum Nachhören, das gespielte ist markiert. */
function MissList({ misses, say, onReview }: { misses: Miss[]; say: (text: string, rate?: number) => void; onReview?: () => void }) {
  return (
    <div style={{ textAlign: 'left', marginTop: 14 }}>
      <h3>Hier lagst du daneben</h3>
      <p className="muted small">Tippe die Wörter an und hör den Unterschied. Gespielt wurde das grün markierte, du hattest das rot markierte gewählt.</p>
      {misses.map((m) => (
        <div key={pairKey(m.pair)} className="row" style={{ gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <span aria-hidden="true">{m.emoji}</span>
          {([0, 1] as const).map((i) => {
            const text = i === 0 ? m.pair.a : m.pair.b;
            const ipa = i === 0 ? m.pair.ipaA : m.pair.ipaB;
            const de = i === 0 ? m.pair.deA : m.pair.deB;
            const played = i === m.correct;
            return (
              <button key={i} className="btn" style={{ flex: 1, minWidth: 130, borderColor: played ? 'var(--good)' : 'var(--bad)' }} onClick={() => say(text, 0.85)} aria-label={`${text} anhören`}>
                <Icon.play /> <b>{text}</b> <span className="ipa muted small">[{ipa}]</span>{de && <span className="muted small"> · {de}</span>}
              </button>
            );
          })}
        </div>
      ))}
      {onReview && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
          <button className="btn primary" onClick={onReview}>🔁 Nur diese nochmal üben</button>
        </div>
      )}
    </div>
  );
}

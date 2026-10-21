/** Satzpuzzle: Satz hören, Wortkärtchen ordnen, dann nachsprechen und bewerten lassen. */
import { useEffect, useState } from 'react';
import { playText } from '../audio/modelVoice';
import { splitLessonTitle } from '../content/bulkImport';
import { checkOrder, makePuzzleRound, type PuzzleItem } from '../game/puzzle';
import { recordListen } from '../game/store';
import { navigate, useApp } from '../state/appState';
import type { Pack } from '../types/content';
import { Badge, Icon } from './components';
import { confetti, sfx, vibrate } from './fx';
import { MascotSays } from './Mascot';
import { TrainerCard } from './TrainerView';

const ROUND = 5;

interface Outcome { firstTry: boolean; score: number | null }

export function PuzzleView({ pack, lessonId }: { pack: Pack; lessonId: string }) {
  const { settings } = useApp();
  const lesson = pack.lessons.find((l) => l.id === lessonId);
  const [items, setItems] = useState<PuzzleItem[]>(() => (lesson ? makePuzzleRound(lesson.vocab, ROUND) : []));
  const [phase, setPhase] = useState<'ready' | 'build' | 'speak' | 'done'>('ready');
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]); // Indizes in shuffled
  const [wrong, setWrong] = useState<boolean[] | null>(null);
  const [tries, setTries] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const item = items[idx];

  const play = (rate = 1) => {
    if (!item) return;
    const e = item.entry;
    void playText(e.fr, { audioId: e.audioId, start: e.start, end: e.end, rate, ttsFallback: settings.ttsFallback, voiceName: settings.ttsVoice || undefined }).catch(() => undefined);
  };
  useEffect(() => { if (phase === 'build') play(); }, [phase, idx, items]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson) return <div className="card">Lektion nicht gefunden.</div>;
  const back = () => navigate({ name: 'lesson', packId: pack.id, lessonId });

  if (!items.length) {
    return (
      <div className="card">
        <h1>🧩 Satzpuzzle</h1>
        <p>In dieser Lektion gibt es keine passenden Sätze (3 bis 10 Wörter).</p>
        <button className="btn" onClick={back}><Icon.prev /> Zurück</button>
      </div>
    );
  }

  const startRound = (next: PuzzleItem[]) => {
    setItems(next);
    setIdx(0);
    setPlaced([]);
    setWrong(null);
    setTries(0);
    setOutcomes([]);
    setPhase('build');
  };

  if (phase === 'ready') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <button className="btn ghost" onClick={back} style={{ float: 'left' }}><Icon.prev /> {splitLessonTitle(lesson.title).part}</button>
        <h1 style={{ clear: 'both' }}>🧩 Satzpuzzle</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood="happy" fr="Écoute, construis, parle !" de="Hören, bauen, sprechen!" />
        </div>
        <p>{items.length} Sätze: Hör den Satz, leg die Wörter in die richtige Reihenfolge und sprich ihn dann selbst.</p>
        <button className="btn primary big" onClick={() => startRound(items)}>Los!</button>
      </div>
    );
  }

  if (phase === 'done') {
    const firstTry = outcomes.filter((o) => o.firstTry).length;
    const scores = outcomes.map((o) => o.score).filter((s): s is number => s !== null && s >= 0);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>{firstTry === items.length ? 'Parfait !' : 'Bien joué !'}</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood={firstTry === items.length ? 'cheer' : 'happy'} fr="Tu as construit toutes les phrases !" de={`${firstTry} von ${items.length} auf Anhieb richtig gebaut${avg !== null ? ` · Aussprache im Schnitt ${avg}` : ''}`} />
        </div>
        <ul className="list" style={{ textAlign: 'left', marginTop: 12 }}>
          {items.map((it, i) => (
            <li key={it.entry.id}>
              <span aria-label={outcomes[i]?.firstTry ? 'auf Anhieb' : 'mit Korrektur'}>{outcomes[i]?.firstTry ? '🧩✅' : '🧩🔁'}</span>
              <div className="fr">{it.entry.fr}</div>
              <span className="spacer" />
              {outcomes[i]?.score == null ? <span className="muted small">nicht gesprochen</span> : outcomes[i]!.score! >= 0 ? <Badge score={outcomes[i]!.score!} /> : <span className="muted small">🎤 gesprochen</span>}
            </li>
          ))}
        </ul>
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={back}><Icon.prev /> Zur Lektion</button>
          <button className="btn primary" onClick={() => startRound(makePuzzleRound(lesson.vocab, ROUND))}><Icon.retry /> Neue Runde</button>
        </div>
      </div>
    );
  }

  if (!item) return null;
  const free = item.shuffled.map((_, i) => i).filter((i) => !placed.includes(i));
  const complete = placed.length === item.solution.length;
  const solved = complete && wrong !== null && wrong.every(Boolean);

  const place = (i: number) => { if (!solved) { setPlaced([...placed, i]); setWrong(null); } };
  const unplace = (pos: number) => { if (!solved) { setPlaced(placed.filter((_, p) => p !== pos)); setWrong(null); } };
  const check = () => {
    const res = checkOrder(placed.map((i) => item.shuffled[i]!), item.solution);
    setWrong(res);
    setTries(tries + 1);
    if (res.every(Boolean)) {
      sfx.success();
      if (tries === 0) void recordListen(true);
    } else { sfx.soft(); vibrate(20); }
  };
  const showSolution = () => {
    // Kärtchen in Lösungsreihenfolge legen (gleiche Wörter: jeweils das nächste freie)
    const used = new Set<number>();
    const order = item.solution.map((w) => { const i = item.shuffled.findIndex((t, k) => t === w && !used.has(k)); used.add(i); return i; });
    setPlaced(order);
    setWrong(item.solution.map(() => true));
    setTries(tries + 1);
  };
  const finishItem = (score: number | null) => {
    const outs = [...outcomes, { firstTry: tries === 1 && placed.length > 0, score }];
    setOutcomes(outs);
    if (idx + 1 >= items.length) {
      setPhase('done');
      sfx.fanfare();
      if (outs.every((o) => o.firstTry)) confetti();
      return;
    }
    setIdx(idx + 1);
    setPlaced([]);
    setWrong(null);
    setTries(0);
    setPhase('build');
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 8 }}>
        <button className="btn ghost" onClick={back}><Icon.prev /> {splitLessonTitle(lesson.title).part}</button>
        <span className="chip">🧩 {idx + 1} / {items.length} · {phase === 'build' ? 'Bauen' : 'Sprechen'}</span>
      </div>
      {phase === 'build' && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'center', marginBottom: 12 }}>
            <button className="btn big" onClick={() => play()}><Icon.play /> Anhören</button>
            <button className="btn" onClick={() => play(0.75)}><Icon.slow /> Langsam</button>
          </div>
          <div className="puzzle-line" aria-label="Dein Satz">
            {placed.length === 0 && <span className="muted small">Tippe die Wörter in der richtigen Reihenfolge an.</span>}
            {placed.map((i, pos) => (
              <button key={`${i}`} className={`tile${wrong ? (wrong[pos] ? ' ok' : ' bad') : ''}`} onClick={() => unplace(pos)}>{item.shuffled[i]}</button>
            ))}
          </div>
          <div className="puzzle-bank">
            {free.map((i) => <button key={i} className="tile" onClick={() => place(i)}>{item.shuffled[i]}</button>)}
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
            {!solved && <button className="btn primary" disabled={!complete} onClick={check}><Icon.check /> Prüfen</button>}
            {!solved && tries >= 2 && <button className="btn ghost" onClick={showSolution}>Lösung zeigen</button>}
            {solved && <span className="listen-ok">{tries === 1 ? 'Auf Anhieb richtig!' : 'Richtig!'}</span>}
            {solved && <button className="btn primary" onClick={() => setPhase('speak')}><Icon.mic /> Jetzt sprechen</button>}
          </div>
          {wrong && !solved && <p className="muted small" style={{ textAlign: 'center' }}>Rot markierte Wörter stehen noch falsch. Tippe sie an, um sie zurückzulegen.</p>}
        </div>
      )}
      {phase === 'speak' && <SpeakStep key={item.entry.id} pack={pack} lessonId={lessonId} item={item} onDone={finishItem} />}
    </div>
  );
}

function SpeakStep({ pack, lessonId, item, onDone }: { pack: Pack; lessonId: string; item: PuzzleItem; onDone: (score: number | null) => void }) {
  const [score, setScore] = useState<number | null>(null);
  const e = item.entry;
  return (
    <>
      <TrainerCard
        compact
        item={{ id: e.id, kind: 'vocab', text: e.fr, de: e.de, ipaOverride: e.ipa, ipaRef: e.ipaRef, audioId: e.audioId, start: e.start, end: e.end, packId: pack.id, lessonId }}
        onResult={(s) => setScore((prev) => Math.max(prev ?? -1, s))}
      />
      <div className="row between" style={{ marginTop: 10 }}>
        {score === null ? <button className="btn ghost" onClick={() => onDone(null)}>Ohne Sprechen weiter</button> : <span />}
        <button className="btn primary" disabled={score === null} onClick={() => onDone(score)}>Weiter <Icon.next /></button>
      </div>
    </>
  );
}

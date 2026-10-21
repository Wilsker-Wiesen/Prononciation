/** Hörverstehen: Einträge einer Lektion hören, Bedeutung oder fehlendes Wort wählen. */
import { useEffect, useMemo, useState } from 'react';
import { playText } from '../audio/modelVoice';
import { splitLessonTitle } from '../content/bulkImport';
import { lessonKind } from '../content/lessonKind';
import { makeQuestion, makeRound, type ListenQuestion } from '../game/listening';
import { recordListen } from '../game/store';
import { navigate, useApp } from '../state/appState';
import type { Pack, VocabEntry } from '../types/content';
import { Icon } from './components';
import { confetti, sfx, vibrate } from './fx';
import { MascotSays } from './Mascot';

const ROUND = 10;

export function ListeningView({ pack, lessonId }: { pack: Pack; lessonId: string }) {
  const { settings } = useApp();
  const lesson = pack.lessons.find((l) => l.id === lessonId);
  // Ablenker aus der Lektion; bei kleinen Lektionen auch aus gleichartigen Lektionen derselben Einheit
  const pool = useMemo<VocabEntry[]>(() => {
    if (!lesson) return [];
    if (lesson.vocab.length >= 8) return lesson.vocab;
    const { unit } = splitLessonTitle(lesson.title);
    const kind = lessonKind(lesson);
    return pack.lessons.filter((l) => l.id === lesson.id || (splitLessonTitle(l.title).unit === unit && lessonKind(l) === kind)).flatMap((l) => l.vocab);
  }, [pack, lesson]);
  const [questions, setQuestions] = useState<ListenQuestion[]>(() => (lesson ? makeRound(lesson.vocab, pool, ROUND) : []));
  const [phase, setPhase] = useState<'ready' | 'run' | 'done'>('ready');
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [misses, setMisses] = useState<ListenQuestion[]>([]);
  const [correct, setCorrect] = useState(0);
  const [xp, setXp] = useState(0);
  const [isReview, setIsReview] = useState(false);
  const q = questions[idx];

  const play = (e: VocabEntry, rate = 1) =>
    void playText(e.fr, { audioId: e.audioId, start: e.start, end: e.end, rate, ttsFallback: settings.ttsFallback, voiceName: settings.ttsVoice || undefined }).catch(() => undefined);

  useEffect(() => { if (phase === 'run' && q) play(q.entry); }, [phase, idx, questions]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson) return <div className="card">Lektion nicht gefunden.</div>;
  const back = () => navigate({ name: 'lesson', packId: pack.id, lessonId });

  if (!questions.length && phase === 'ready') {
    return (
      <div className="card">
        <h1>👂 Hörverstehen</h1>
        <p>Diese Lektion hat zu wenige Einträge für Hörfragen.</p>
        <button className="btn" onClick={back}><Icon.prev /> Zurück</button>
      </div>
    );
  }

  const start = (qs: ListenQuestion[], review: boolean) => {
    setQuestions(qs);
    setIdx(0);
    setChosen(null);
    setCorrect(0);
    setXp(0);
    setIsReview(review);
    if (!review) setMisses([]);
    setPhase('run');
  };

  const answer = (option: string) => {
    if (!q || chosen !== null) return;
    setChosen(option);
    const ok = option === q.answer;
    if (ok) { setCorrect((c) => c + 1); sfx.success(); }
    else { sfx.soft(); vibrate(20); if (!isReview) setMisses((m) => [...m, q]); }
    void recordListen(ok).then((r) => { if (r) setXp((x) => x + r.xp); });
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      setPhase('done');
      sfx.fanfare();
      if (correct === questions.length) confetti();
      return;
    }
    setIdx(idx + 1);
    setChosen(null);
  };

  if (phase === 'ready') {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <button className="btn ghost" onClick={back} style={{ float: 'left' }}><Icon.prev /> {splitLessonTitle(lesson.title).part}</button>
        <h1 style={{ clear: 'both' }}>👂 Hörverstehen</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood="happy" fr="Écoute bien !" de="Hör gut zu!" />
        </div>
        <p>Du hörst {questions.length} Aufnahmen aus „{lesson.title}“. Wähle jeweils, was du gehört hast: die Bedeutung oder das fehlende Wort.</p>
        <button className="btn primary big" onClick={() => start(questions, false)}>Los!</button>
      </div>
    );
  }

  if (phase === 'done') {
    const total = questions.length;
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>{correct === total ? 'Parfait !' : 'Bien écouté !'}</h1>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MascotSays mood={correct === total ? 'cheer' : 'happy'} fr={`${correct} sur ${total}`} de={`${correct} von ${total} richtig`} />
        </div>
        {xp > 0 && <div className="row" style={{ justifyContent: 'center' }}><span className="badge good reward-pop">+{xp} XP</span></div>}
        {!isReview && misses.length > 0 && (
          <div style={{ textAlign: 'left', marginTop: 14 }}>
            <h3>Hier lagst du daneben</h3>
            <ul className="list">
              {misses.map((m) => (
                <li key={m.entry.id}>
                  <button className="btn ghost" aria-label="Anhören" onClick={() => play(m.entry, 0.85)}><Icon.play /></button>
                  <div>
                    <div className="fr">{m.entry.fr}</div>
                    {m.entry.de && <div className="de small">{m.entry.de}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" onClick={back}><Icon.prev /> Zur Lektion</button>
          {!isReview && misses.length > 0 && (
            <button className="btn" onClick={() => start(misses.map((m) => makeQuestion(m.entry, pool) ?? m), true)}>🔁 Nur diese nochmal</button>
          )}
          <button className="btn primary" onClick={() => start(makeRound(lesson.vocab, pool, ROUND), false)}><Icon.retry /> Neue Runde</button>
        </div>
      </div>
    );
  }

  if (!q) return null;
  const answered = chosen !== null;
  return (
    <div className="card">
      <div className="row between">
        <span className="chip">{isReview ? '🔁 Fehlerrunde · ' : ''}{idx + 1} / {questions.length}</span>
        <span className="chip">✅ {correct}</span>
      </div>
      <div className="row" style={{ justifyContent: 'center', margin: '16px 0' }}>
        <button className="btn big" onClick={() => play(q.entry)}><Icon.play /> Nochmal hören</button>
        <button className="btn" onClick={() => play(q.entry, 0.8)}><Icon.slow /> Langsamer</button>
      </div>
      {q.type === 'gap' ? (
        <p className="fr listen-gap">
          {q.before}<span className={`gap${answered ? ' ok' : ''}`}>{answered ? q.answer : '_____'}</span>{q.after}
        </p>
      ) : (
        <p className="listen-ask">Was bedeutet das?{answered && <><br /><span className="fr">{q.entry.fr}</span></>}</p>
      )}
      <div className="listen-options">
        {q.options.map((o) => {
          const cls = !answered ? '' : o === q.answer ? ' primary' : o === chosen ? ' wrong' : '';
          return <button key={o} className={`btn big${cls}`} disabled={answered && o !== q.answer && o !== chosen} onClick={() => answer(o)}>{o}</button>;
        })}
      </div>
      {answered && (
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          <span className={chosen === q.answer ? 'listen-ok' : 'listen-bad'}>{chosen === q.answer ? 'Richtig!' : q.type === 'gap' ? `Richtig wäre „${q.answer}“.` : `„${q.entry.fr}“ heißt „${q.answer}“.`}</span>
          <button className="btn primary" onClick={next}>Weiter <Icon.next /></button>
        </div>
      )}
    </div>
  );
}

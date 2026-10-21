/** Startseite: Pakete und Lektionen. */
import { splitLessonTitle } from '../content/bulkImport';
import { KIND_LABEL, lessonKind } from '../content/lessonKind';
import { navigate, useApp } from '../state/appState';
import type { Lesson, Pack } from '../types/content';
import { Icon } from './components';
import { InstallHint } from './InstallHint';
import { TodayPanel } from './TodayPanel';

export function HomeView() {
  const { packs, ready, settings } = useApp();
  if (!ready) return <div className="card muted">Wird geladen …</div>;
  return (
    <div>
      <InstallHint />
      <TodayPanel />
      {packs.length === 0 && (
        <div className="card">
          <p>Noch keine Inhalte. Importiere ein Paket deiner Lehrkraft.</p>
          <button className="btn primary" onClick={() => navigate({ name: 'packs' })}>Paket importieren</button>
        </div>
      )}
      <h2 style={{ marginTop: 18 }}>Meine Lektionen</h2>
      {packs.map((p) => (
        <div className="card" key={p.id}>
          <div className="row between">
            <div>
              <h2 style={{ margin: 0 }}>{p.title}</h2>
              <div className="muted small">{[p.level, p.source].filter(Boolean).join(' · ')}</div>
            </div>
            {settings.teacherMode && <button className="btn ghost" onClick={() => navigate({ name: 'teacher', packId: p.id })}>Bearbeiten</button>}
          </div>
          <PackLessons pack={p} />
        </div>
      ))}
    </div>
  );
}

/**
 * Lektionen eines Pakets. Heißen sie „Unité 3 – Vokabeln“, werden sie je Einheit in einer Zeile
 * zusammengefasst (ganze Bände bleiben so übersichtlich), sonst einfache Liste.
 */
function PackLessons({ pack }: { pack: Pack }) {
  const groups = new Map<string, { part: string; lesson: Lesson }[]>();
  for (const l of pack.lessons) {
    const { unit, part } = splitLessonTitle(l.title);
    if (!groups.has(unit)) groups.set(unit, []);
    groups.get(unit)!.push({ part, lesson: l });
  }
  const grouped = [...groups.values()].some((g) => g.length > 1 || g[0]!.part !== g[0]!.lesson.title);
  const count = (l: Lesson) => l.vocab.length + l.texts.reduce((a, t) => a + t.sentences.length, 0);
  if (!pack.lessons.length) return <p className="muted">Keine Lektionen.</p>;
  if (!grouped) {
    return (
      <ul className="list" style={{ marginTop: 8 }}>
        {pack.lessons.map((l) => (
          <li key={l.id}>
            <div>
              <div className="fr">{l.title}</div>
              <div className="de small">{[l.vocab.length ? `${l.vocab.length} ${KIND_LABEL[lessonKind(l)]}` : '', l.texts.length ? `${l.texts.length} Texte` : ''].filter(Boolean).join(' · ') || 'leer'}</div>
            </div>
            <span className="spacer" />
            <button className="btn" onClick={() => navigate({ name: 'lesson', packId: pack.id, lessonId: l.id })}>Öffnen <Icon.next /></button>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="unit-grid" style={{ marginTop: 8 }}>
      {[...groups.entries()].map(([unit, parts]) => (
        <div key={unit} className="unit-row">
          <div className="unit-name">{unit}</div>
          <div className="row" style={{ gap: 6 }}>
            {parts.map(({ part, lesson }) => (
              <button key={lesson.id} className="btn" onClick={() => navigate({ name: 'lesson', packId: pack.id, lessonId: lesson.id })}>
                {part} <span className="muted small">{count(lesson)}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

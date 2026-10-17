/** Startseite: Pakete und Lektionen. */
import { navigate, useApp } from '../state/appState';
import { Icon } from './components';

export function HomeView() {
  const { packs, ready, settings } = useApp();
  if (!ready) return <div className="card muted">Wird geladen …</div>;
  return (
    <div>
      <h1>Aussprache trainieren</h1>
      <p className="muted">Wähle eine Lektion. Hören, nachsprechen, vergleichen – alles bleibt auf deinem Gerät.</p>
      {packs.length === 0 && (
        <div className="card">
          <p>Noch keine Inhalte. Importiere ein Paket deiner Lehrkraft.</p>
          <button className="btn primary" onClick={() => navigate({ name: 'packs' })}>Paket importieren</button>
        </div>
      )}
      <div className="card" style={{ background: 'color-mix(in srgb, var(--accent) 14%, var(--surface))' }}>
        <div className="row between">
          <div>
            <h2 style={{ margin: 0 }}>🎯 Missionen</h2>
            <div className="muted small">Eine Regel, ein Hörquiz, fünf Wörter: sammle Sterne und Abzeichen.</div>
          </div>
          <button className="btn primary" onClick={() => navigate({ name: 'mission' })}>Zu den Missionen <Icon.next /></button>
        </div>
      </div>
      {packs.map((p) => (
        <div className="card" key={p.id}>
          <div className="row between">
            <div>
              <h2 style={{ margin: 0 }}>{p.title}</h2>
              <div className="muted small">{[p.level, p.source].filter(Boolean).join(' · ')}</div>
            </div>
            {settings.teacherMode && <button className="btn ghost" onClick={() => navigate({ name: 'teacher', packId: p.id })}>Bearbeiten</button>}
          </div>
          <ul className="list" style={{ marginTop: 8 }}>
            {p.lessons.map((l) => (
              <li key={l.id}>
                <div>
                  <div className="fr">{l.title}</div>
                  <div className="de small">{l.vocab.length} Vokabeln · {l.texts.length} Texte</div>
                </div>
                <span className="spacer" />
                <button className="btn" onClick={() => navigate({ name: 'lesson', packId: p.id, lessonId: l.id })}>Öffnen <Icon.next /></button>
              </li>
            ))}
            {p.lessons.length === 0 && <li className="muted">Keine Lektionen.</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

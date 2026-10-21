import { useEffect } from 'react';
import { setSoundEnabled } from './ui/fx';
import { loadGame } from './game/store';
import { AppProvider, navigate, useApp, useRoute } from './state/appState';
import { HomeView } from './ui/HomeView';
import { InfoView } from './ui/InfoView';
import { LessonView } from './ui/LessonView';
import { ListeningView } from './ui/ListeningView';
import { PuzzleView } from './ui/PuzzleView';
import { MissionsView } from './ui/MissionsView';
import { BlitzView } from './ui/BlitzView';
import { PacksView } from './ui/PacksView';
import { ProgressView } from './ui/ProgressView';
import { SettingsView } from './ui/SettingsView';
import { TeacherView } from './ui/TeacherView';
import { TrainerView } from './ui/TrainerView';

function Shell() {
  const route = useRoute();
  const { packs, settings, ready } = useApp();
  useEffect(() => { window.scrollTo(0, 0); }, [route]);
  useEffect(() => { setSoundEnabled(settings.soundEnabled); }, [settings.soundEnabled]);
  useEffect(() => { void loadGame(); }, []);

  const nav = (name: 'home' | 'mission' | 'progress' | 'packs' | 'settings' | 'teacher' | 'info', label: string, icon: string, secondary = false, short = label) => {
    const active = route.name === name || (name === 'home' && (route.name === 'lesson' || route.name === 'train' || route.name === 'listen' || route.name === 'puzzle' || route.name === 'blitz'));
    return (
      <button className={`${active ? 'active' : ''}${secondary ? ' secondary' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => navigate({ name })}>
        <span className="tab-icon" aria-hidden="true">{icon}</span>
        <span className="tab-label">{label}</span>
        <span className="tab-short">{short}</span>
      </button>
    );
  };

  let view: React.ReactNode;
  if (!ready) view = <div className="card muted">Wird geladen …</div>;
  else if (route.name === 'lesson' || route.name === 'train' || route.name === 'listen' || route.name === 'puzzle') {
    const pack = packs.find((p) => p.id === route.packId);
    if (!pack) view = <div className="card">Paket nicht gefunden. <button className="btn" onClick={() => navigate({ name: 'home' })}>Zur Startseite</button></div>;
    else if (route.name === 'lesson') view = <LessonView pack={pack} lessonId={route.lessonId} tab={route.tab} />;
    else if (route.name === 'listen') view = <ListeningView key={location.hash} pack={pack} lessonId={route.lessonId} />;
    else if (route.name === 'puzzle') view = <PuzzleView key={location.hash} pack={pack} lessonId={route.lessonId} />;
    else view = <TrainerView key={location.hash} pack={pack} lessonId={route.lessonId} kind={route.kind} itemId={route.itemId} index={route.index} focus={route.focus} />;
  } else if (route.name === 'mission') view = <MissionsView key={route.phenomenonId ?? 'list'} phenomenonId={route.phenomenonId} />;
  else if (route.name === 'blitz') view = <BlitzView />;
  else if (route.name === 'progress') view = <ProgressView />;
  else if (route.name === 'settings') view = <SettingsView />;
  else if (route.name === 'packs') view = <PacksView />;
  else if (route.name === 'teacher') view = <TeacherView packId={route.packId} lessonId={route.lessonId} />;
  else if (route.name === 'info') view = <InfoView />;
  else view = <HomeView />;

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/" style={{ color: 'inherit', textDecoration: 'none' }}>
          <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" aria-hidden="true" />
          Prononciation
        </a>
        <nav aria-label="Hauptnavigation">
          {nav('home', 'Lernen', '🏠')}
          {nav('mission', 'Lernpfad', '🗺️')}
          {nav('progress', 'Lernstand', '📈')}
          {nav('packs', 'Pakete', '📦')}
          {settings.teacherMode && nav('teacher', 'Editor', '✏️', true)}
          {nav('settings', 'Einstellungen', '⚙️', false, 'Mehr')}
          {nav('info', 'Info', 'ℹ️', true)}
        </nav>
      </header>
      <main className="content">{view}</main>
      <div className="footer">Prononciation · Aussprachetrainer Französisch · alle Daten bleiben auf diesem Gerät</div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

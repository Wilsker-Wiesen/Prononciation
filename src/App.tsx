import { useEffect } from 'react';
import { setSoundEnabled } from './ui/fx';
import { loadGame } from './game/store';
import { AppProvider, navigate, useApp, useRoute } from './state/appState';
import { HomeView } from './ui/HomeView';
import { InfoView } from './ui/InfoView';
import { LessonView } from './ui/LessonView';
import { MissionsView } from './ui/MissionsView';
import { BlitzView } from './ui/BlitzView';
import { ShopView } from './ui/ShopView';
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

  const nav = (name: 'home' | 'mission' | 'progress' | 'packs' | 'settings' | 'teacher' | 'info', label: string) => (
    <button className={route.name === name || (name === 'home' && (route.name === 'lesson' || route.name === 'train' || route.name === 'blitz' || route.name === 'shop')) ? 'active' : ''} onClick={() => navigate({ name })}>{label}</button>
  );

  let view: React.ReactNode;
  if (!ready) view = <div className="card muted">Wird geladen …</div>;
  else if (route.name === 'lesson' || route.name === 'train') {
    const pack = packs.find((p) => p.id === route.packId);
    if (!pack) view = <div className="card">Paket nicht gefunden. <button className="btn" onClick={() => navigate({ name: 'home' })}>Zur Startseite</button></div>;
    else if (route.name === 'lesson') view = <LessonView pack={pack} lessonId={route.lessonId} tab={route.tab} />;
    else view = <TrainerView key={location.hash} pack={pack} lessonId={route.lessonId} kind={route.kind} itemId={route.itemId} index={route.index} focus={route.focus} />;
  } else if (route.name === 'mission') view = <MissionsView key={route.phenomenonId ?? 'list'} phenomenonId={route.phenomenonId} />;
  else if (route.name === 'blitz') view = <BlitzView />;
  else if (route.name === 'shop') view = <ShopView />;
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
          <svg viewBox="0 0 128 128" aria-hidden="true"><rect width="128" height="128" rx="28" fill="#f7f5f0" /><path d="M40 92V36h22c14 0 22 8 22 19s-8 19-22 19H52v18z" fill="#1f4e79" /><path d="M52 47v16h10c6 0 10-3 10-8s-4-8-10-8z" fill="#f7f5f0" /><path d="M86 44c6 6 9 13 9 20s-3 14-9 20" stroke="#e8b84a" strokeWidth="5" fill="none" strokeLinecap="round" /></svg>
          Prononciation
        </a>
        <nav aria-label="Hauptnavigation">
          {nav('home', 'Lernen')}
          {nav('mission', 'Lernpfad')}
          {nav('progress', 'Lernstand')}
          {nav('packs', 'Pakete')}
          {settings.teacherMode && nav('teacher', 'Editor')}
          {nav('settings', 'Einstellungen')}
          {nav('info', 'Info')}
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

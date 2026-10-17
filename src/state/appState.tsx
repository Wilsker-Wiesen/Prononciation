/**
 * Globaler Zustand: Einstellungen, Pakete, Modellstatus, Routing (Hash).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { recognizer, type LoadProgress, type ModelState } from '../asr/client';
import { modelOption } from '../asr/models';
import type { ModelSource } from '../asr/modelLoader';
import { demoPack, DEMO_PACK_ID } from '../content/demo';
import { conjugationPack, CONJUGATION_VERSION } from '../content/conjugation';
import { getPack, listPacks, loadSettings, savePack, saveSettings } from '../storage/db';
import { DEFAULT_SETTINGS, type Pack, type Settings } from '../types/content';

// ---------- Einstellungen + Pakete ----------

interface AppContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  packs: Pack[];
  refreshPacks: () => Promise<void>;
  ready: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [ready, setReady] = useState(false);

  const refreshPacks = useCallback(async () => {
    setPacks(await listPacks());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let s = await loadSettings();
        // Beispielpaket beim ersten Start anlegen
        if (!(await getPack(DEMO_PACK_ID))) {
          const all = await listPacks();
          if (all.length === 0) await savePack(demoPack());
        }
        // Eingebautes Konjugationspaket installieren bzw. aktualisieren (gelöscht bleibt gelöscht bis zur nächsten Version)
        if ((s.conjugationVersion ?? 0) < CONJUGATION_VERSION) {
          await savePack(conjugationPack());
          s = { ...s, conjugationVersion: CONJUGATION_VERSION };
          await saveSettings(s);
        }
        setSettings(s);
        await refreshPacks();
      } finally {
        setReady(true);
      }
    })();
  }, [refreshPacks]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void saveSettings(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, updateSettings, packs, refreshPacks, ready }), [settings, updateSettings, packs, refreshPacks, ready]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const v = useContext(AppContext);
  if (!v) throw new Error('AppProvider fehlt');
  return v;
}

// ---------- Modellstatus (Erkennung) ----------

interface ModelStatus {
  state: ModelState;
  progress: LoadProgress | null;
  error: string | null;
}

let modelStatus: ModelStatus = { state: 'idle', progress: null, error: null };
const modelListeners = new Set<() => void>();
function setModelStatus(patch: Partial<ModelStatus>) {
  modelStatus = { ...modelStatus, ...patch };
  for (const l of modelListeners) l();
}
recognizer.onProgress((p) => setModelStatus({ progress: p }));

export function useModelStatus(): ModelStatus {
  return useSyncExternalStore(
    (cb) => { modelListeners.add(cb); return () => modelListeners.delete(cb); },
    () => modelStatus,
  );
}

let loadPromise: Promise<void> | null = null;
export function loadModel(settings: Settings): Promise<void> {
  if (recognizer.state === 'ready') return Promise.resolve();
  if (loadPromise) return loadPromise;
  setModelStatus({ state: 'loading', error: null, progress: null });
  loadPromise = recognizer
    .load(modelSources(settings))
    .then(() => setModelStatus({ state: 'ready', progress: null }))
    .catch((e: unknown) => {
      setModelStatus({ state: 'error', error: e instanceof Error ? e.message : String(e) });
      throw e;
    })
    .finally(() => { loadPromise = null; });
  return loadPromise;
}

export function modelSources(settings: Settings): ModelSource[] {
  if (settings.modelId === 'custom') {
    const base = settings.modelBaseUrl.endsWith('/') ? settings.modelBaseUrl : `${settings.modelBaseUrl}/`;
    return [{ baseUrl: base, modelFile: settings.modelFile, vocabFile: settings.modelVocabFile }];
  }
  return modelOption(settings.modelId).sources;
}

export async function unloadModel(): Promise<void> {
  await recognizer.unload();
  setModelStatus({ state: 'idle', progress: null, error: null });
}

// ---------- Hash-Routing ----------

export type Route =
  | { name: 'home' }
  | { name: 'lesson'; packId: string; lessonId: string; tab?: string }
  | { name: 'train'; packId: string; lessonId: string; kind: 'vocab' | 'text'; itemId?: string; index?: number; focus?: string }
  | { name: 'progress' }
  | { name: 'settings' }
  | { name: 'packs' }
  | { name: 'teacher'; packId?: string; lessonId?: string }
  | { name: 'mission'; phenomenonId?: import('../phon/phenomena').PhenomenonId }
  | { name: 'blitz' }
  | { name: 'info' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent).filter(Boolean);
  switch (parts[0]) {
    case 'lesson':
      return parts[1] && parts[2] ? { name: 'lesson', packId: parts[1], lessonId: parts[2], tab: parts[3] } : { name: 'home' };
    case 'train':
      return parts[1] && parts[2] && (parts[3] === 'vocab' || parts[3] === 'text')
        ? { name: 'train', packId: parts[1], lessonId: parts[2], kind: parts[3], itemId: parts[4] === '-' ? undefined : parts[4], index: parts[5] && parts[5] !== '-' ? Number(parts[5]) : undefined, focus: parts[6] }
        : { name: 'home' };
    case 'progress': return { name: 'progress' };
    case 'settings': return { name: 'settings' };
    case 'packs': return { name: 'packs' };
    case 'teacher': return { name: 'teacher', packId: parts[1], lessonId: parts[2] };
    case 'mission': return { name: 'mission', phenomenonId: parts[1] as import('../phon/phenomena').PhenomenonId | undefined };
    case 'info': return { name: 'info' };
    case 'blitz': return { name: 'blitz' };
    default: return { name: 'home' };
  }
}

export function routeToHash(r: Route): string {
  const e = encodeURIComponent;
  switch (r.name) {
    case 'home': return '#/';
    case 'lesson': return `#/lesson/${e(r.packId)}/${e(r.lessonId)}${r.tab ? `/${e(r.tab)}` : ''}`;
    case 'train': return `#/train/${e(r.packId)}/${e(r.lessonId)}/${r.kind}${r.focus ? `/${r.itemId ? e(r.itemId) : '-'}/${r.index ?? '-'}/${e(r.focus)}` : `${r.itemId ? `/${e(r.itemId)}` : ''}${r.index !== undefined ? `/${r.index}` : ''}`}`;
    case 'teacher': return `#/teacher${r.packId ? `/${e(r.packId)}` : ''}${r.lessonId ? `/${e(r.lessonId)}` : ''}`;
    case 'mission': return `#/mission${r.phenomenonId ? `/${e(r.phenomenonId)}` : ''}`;
    default: return `#/${r.name}`;
  }
}

export function navigate(r: Route): void {
  location.hash = routeToHash(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

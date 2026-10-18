/**
 * Lehrkraft-Editor: Pakete, Lektionen, Vokabeln, Texte, Audio-Zuordnung, Export.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { player } from '../audio/player';
import { exportPackZip, normalizeForMatch, stripExt } from '../content/pack';
import { ipaString, transcribe } from '../phon/g2p';
import { navigate, useApp } from '../state/appState';
import { deleteAudio, getAudio, listAudioForPack, putAudio, putAudioMany, savePack } from '../storage/db';
import { PACK_FORMAT_VERSION, newId, type AudioAsset, type Lesson, type Pack, type Sentence, type TextItem, type VocabEntry } from '../types/content';
import { Icon } from './components';
import { SplitAudio } from './SplitAudio';
import { groupPlanByBand, materialize, planBulkImport, type BulkPlan } from '../content/bulkImport';
import { download } from './ProgressView';

export function TeacherView({ packId, lessonId }: { packId?: string; lessonId?: string }) {
  const { packs, refreshPacks } = useApp();
  const pack = packs.find((p) => p.id === packId);
  if (!packId) return <PackChooser />;
  if (!pack) return <div className="card">Paket nicht gefunden.</div>;
  return <PackEditor key={pack.id} initial={pack} lessonId={lessonId} onSaved={refreshPacks} />;
}

function PackChooser() {
  const { packs, refreshPacks } = useApp();
  const create = async () => {
    const now = new Date().toISOString();
    const p: Pack = { id: newId('pack'), title: 'Neues Paket', formatVersion: PACK_FORMAT_VERSION, createdAt: now, updatedAt: now, lessons: [] };
    await savePack(p);
    await refreshPacks();
    navigate({ name: 'teacher', packId: p.id });
  };
  return (
    <div>
      <h1>Lehrkraft-Editor</h1>
      <div className="card">
        <p className="muted small">Lege Pakete mit Lektionen, Vokabeln, Texten und Audio an und exportiere sie als ZIP für deine Lerngruppe.</p>
        <button className="btn primary" onClick={() => void create()}>Neues Paket anlegen</button>
      </div>
      <BulkImport onPacks={async () => { await refreshPacks(); }} />
      {packs.map((p) => (
        <div className="card" key={p.id}>
          <div className="row between">
            <div><b>{p.title}</b> <span className="muted small">· {p.lessons.length} Lektionen</span></div>
            <button className="btn" onClick={() => navigate({ name: 'teacher', packId: p.id })}>Bearbeiten</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PackEditor({ initial, lessonId, onSaved }: { initial: Pack; lessonId?: string; onSaved: () => Promise<void> }) {
  const [pack, setPack] = useState<Pack>(initial);
  const [dirty, setDirty] = useState(false);
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [activeLesson, setActiveLesson] = useState<string | undefined>(lessonId ?? initial.lessons[0]?.id);
  const lesson = pack.lessons.find((l) => l.id === activeLesson);

  const reloadAssets = useCallback(() => listAudioForPack(pack.id).then(setAssets), [pack.id]);
  useEffect(() => { void reloadAssets(); }, [reloadAssets]);

  const update = (fn: (p: Pack) => Pack) => { setPack((p) => fn(structuredClone(p))); setDirty(true); };
  const updateLesson = (fn: (l: Lesson) => void) => update((p) => { const l = p.lessons.find((x) => x.id === activeLesson); if (l) fn(l); return p; });
  const save = async () => { await savePack(pack); setDirty(false); await onSaved(); };

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  return (
    <div>
      <div className="row between">
        <button className="btn ghost" onClick={() => navigate({ name: 'teacher' })}><Icon.prev /> Pakete</button>
        <div className="row">
          <button className="btn primary" disabled={!dirty} onClick={() => void save()}>{dirty ? 'Speichern' : 'Gespeichert'}</button>
          <button className="btn" onClick={async () => { await save(); download(await exportPackZip(pack), `${pack.title.replace(/[^\p{L}\p{N}]+/gu, '-')}.zip`); }}>Als ZIP exportieren</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="grid">
          <label className="field">Titel<input value={pack.title} onChange={(e) => update((p) => ({ ...p, title: e.target.value }))} /></label>
          <label className="field">Jahrgang / Band<input value={pack.level ?? ''} onChange={(e) => update((p) => ({ ...p, level: e.target.value }))} /></label>
          <label className="field">Quelle (z. B. Lehrwerk, nur als Hinweis)<input value={pack.source ?? ''} onChange={(e) => update((p) => ({ ...p, source: e.target.value }))} /></label>
          <label className="field">Autor/in<input value={pack.author ?? ''} onChange={(e) => update((p) => ({ ...p, author: e.target.value }))} /></label>
        </div>
        <label className="field" style={{ marginTop: 8 }}>Rechtehinweis zu den Audiodateien (wird im Paket mitgegeben)
          <input value={pack.rightsNote ?? ''} onChange={(e) => update((p) => ({ ...p, rightsNote: e.target.value }))} placeholder="z. B. Nutzung nur innerhalb der Lerngruppe gemäß Schullizenz" />
        </label>
      </div>

      <div className="card">
        <div className="row between">
          <h2 style={{ margin: 0 }}>Lektionen</h2>
          <button className="btn" onClick={() => { const id = newId('les'); update((p) => ({ ...p, lessons: [...p.lessons, { id, title: `Unité ${p.lessons.length + 1}`, sections: [], vocab: [], texts: [] }] })); setActiveLesson(id); }}>+ Lektion</button>
        </div>
        <div className="tabs" style={{ marginTop: 8 }}>
          {pack.lessons.map((l) => (
            <button key={l.id} className={l.id === activeLesson ? 'active' : ''} onClick={() => setActiveLesson(l.id)}>{l.title}</button>
          ))}
        </div>
        {lesson && (
          <div className="stack">
            <div className="row">
              <label className="field" style={{ flex: 1 }}>Titel der Lektion<input value={lesson.title} onChange={(e) => updateLesson((l) => { l.title = e.target.value; })} /></label>
              <button className="btn danger" onClick={() => { if (confirm('Lektion löschen?')) { update((p) => ({ ...p, lessons: p.lessons.filter((x) => x.id !== lesson.id) })); setActiveLesson(undefined); } }}>Lektion löschen</button>
            </div>
            <VocabEditor lesson={lesson} assets={assets} packId={pack.id} updateLesson={updateLesson} reloadAssets={reloadAssets} />
            <TextEditor lesson={lesson} assets={assets} updateLesson={updateLesson} />
          </div>
        )}
      </div>

      <BulkImport pack={pack} onDone={async (lessons) => { update((p) => ({ ...p, lessons: [...p.lessons, ...lessons] })); await reloadAssets(); }} />
      <AudioLibrary packId={pack.id} assets={assets} reload={reloadAssets} lesson={lesson} updateLesson={updateLesson} />
    </div>
  );
}

// ---------- Vokabeln ----------

function VocabEditor({ lesson, assets, packId, updateLesson, reloadAssets }: { lesson: Lesson; assets: AudioAsset[]; packId: string; updateLesson: (fn: (l: Lesson) => void) => void; reloadAssets: () => Promise<void> }) {
  const [bulk, setBulk] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const assetByName = useMemo(() => {
    const m = new Map<string, AudioAsset>();
    for (const a of assets) m.set(normalizeForMatch(stripExt(a.fileName ?? a.id)), a);
    return m;
  }, [assets]);

  const addBulk = () => {
    const rows = bulk.split('\n').map((l) => l.trim()).filter(Boolean);
    const entries: VocabEntry[] = rows.map((r) => {
      const [fr, de = ''] = r.split(/\t| – | - |;|\|/).map((s) => s.trim());
      return { id: newId('v'), fr: fr ?? '', de };
    });
    updateLesson((l) => { l.vocab.push(...entries); });
    setBulk('');
    setShowBulk(false);
  };

  const autoMatch = () => {
    let n = 0;
    updateLesson((l) => {
      for (const v of l.vocab) {
        if (v.audioId) continue;
        const key = normalizeForMatch(v.fr);
        const a = assetByName.get(key) ?? [...assetByName.entries()].find(([k]) => k === key.split(' ')[0])?.[1];
        if (a) { v.audioId = a.id; n++; }
      }
    });
    alert(`${n} Audiodateien automatisch zugeordnet.`);
  };

  const onAudioFiles = async (files: FileList | null, entry: VocabEntry) => {
    const f = files?.[0];
    if (!f) return;
    const id = newId('a');
    await putAudio({ id, packId, mime: f.type || 'audio/mpeg', blob: f, fileName: f.name });
    updateLesson((l) => { const v = l.vocab.find((x) => x.id === entry.id); if (v) v.audioId = id; });
    await reloadAssets();
  };

  return (
    <div>
      <div className="row between" style={{ marginTop: 8 }}>
        <h3 style={{ margin: 0 }}>Vokabeln ({lesson.vocab.length})</h3>
        <div className="row">
          <button className="btn" onClick={() => setShowBulk(!showBulk)}>Liste einfügen</button>
          <button className="btn" onClick={autoMatch} disabled={!assets.length}>Audio automatisch zuordnen</button>
          <button className="btn" onClick={() => updateLesson((l) => { l.vocab.push({ id: newId('v'), fr: '', de: '' }); })}>+ Vokabel</button>
        </div>
      </div>
      {showBulk && (
        <div className="stack" style={{ marginTop: 8 }}>
          <label className="field">Eine Vokabel pro Zeile: „französisch [Tab oder –] deutsch“
            <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'le collège\tdie Schule\nla classe – die Klasse'} />
          </label>
          <div className="row"><button className="btn primary" onClick={addBulk} disabled={!bulk.trim()}>Hinzufügen</button></div>
        </div>
      )}
      <table className="tbl" style={{ marginTop: 8 }}>
        <thead><tr><th style={{ width: '30%' }}>Französisch</th><th style={{ width: '25%' }}>Deutsch</th><th>Lautschrift</th><th>Audio</th><th></th></tr></thead>
        <tbody>
          {lesson.vocab.map((v) => (
            <VocabRow key={v.id} v={v} assets={assets} updateLesson={updateLesson} onAudioFiles={onAudioFiles} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VocabRow({ v, assets, updateLesson, onAudioFiles }: { v: VocabEntry; assets: AudioAsset[]; updateLesson: (fn: (l: Lesson) => void) => void; onAudioFiles: (files: FileList | null, entry: VocabEntry) => Promise<void> }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const auto = useMemo(() => (v.fr ? ipaString(transcribe(v.fr)) : ''), [v.fr]);
  const set = (patch: Partial<VocabEntry>) => updateLesson((l) => { const x = l.vocab.find((e) => e.id === v.id); if (x) Object.assign(x, patch); });
  const asset = assets.find((a) => a.id === v.audioId);
  return (
    <tr>
      <td><input value={v.fr} onChange={(e) => set({ fr: e.target.value })} /></td>
      <td><input value={v.de} onChange={(e) => set({ de: e.target.value })} /></td>
      <td>
        <input className="ipa" value={v.ipa ?? ''} placeholder={auto} onChange={(e) => set({ ipa: e.target.value || undefined })} title="Leer lassen = automatische Transkription; hier kann die Lautschrift korrigiert werden" />
      </td>
      <td>
        <div className="row" style={{ gap: 4 }}>
          {asset ? (
            <>
              <button className="btn ghost" title={`${asset.fileName ?? ''}${v.start !== undefined ? ` ${v.start}–${v.end} s` : ''}`} onClick={() => void player.play(asset.blob, { start: v.start, end: v.end })}><Icon.play /></button>
              {v.start !== undefined && <span className="muted small">{v.start}–{v.end} s</span>}
              <button className="btn ghost small" onClick={() => set({ audioId: undefined, start: undefined, end: undefined })}>×</button>
            </>
          ) : (
            <>
              <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => void onAudioFiles(e.target.files, v)} />
              <button className="btn ghost small" onClick={() => fileRef.current?.click()}>Datei …</button>
              {assets.length > 0 && (
                <select onChange={(e) => set({ audioId: e.target.value || undefined })} value="">
                  <option value="">Bibliothek …</option>
                  {assets.map((a) => <option key={a.id} value={a.id}>{a.fileName ?? a.id}</option>)}
                </select>
              )}
            </>
          )}
        </div>
      </td>
      <td><button className="btn ghost small" onClick={() => updateLesson((l) => { l.vocab = l.vocab.filter((e) => e.id !== v.id); })} aria-label="Löschen">🗑</button></td>
    </tr>
  );
}

// ---------- Texte ----------

function TextEditor({ lesson, assets, updateLesson }: { lesson: Lesson; assets: AudioAsset[]; updateLesson: (fn: (l: Lesson) => void) => void }) {
  const addText = () => {
    const raw = prompt('Text einfügen (ein Satz pro Zeile oder Fließtext; Sätze werden an . ! ? getrennt):');
    if (!raw) return;
    const title = prompt('Titel des Textes:', 'Texte') ?? 'Text';
    const sentences: Sentence[] = raw
      .split(/(?<=[.!?…])\s+|\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((fr) => ({ id: newId('s'), fr }));
    const t: TextItem = { id: newId('t'), title, sentences };
    updateLesson((l) => { l.texts.push(t); });
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>Texte ({lesson.texts.length})</h3>
        <button className="btn" onClick={addText}>+ Text</button>
      </div>
      {lesson.texts.map((t) => (
        <div className="card flat" key={t.id} style={{ marginTop: 8 }}>
          <div className="row">
            <label className="field" style={{ flex: 1 }}>Titel<input value={t.title} onChange={(e) => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id); if (x) x.title = e.target.value; })} /></label>
            <label className="field">Audio des ganzen Textes
              <select value={t.audioId ?? ''} onChange={(e) => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id); if (x) x.audioId = e.target.value || undefined; })}>
                <option value="">– keins –</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.fileName ?? a.id}</option>)}
              </select>
            </label>
            <button className="btn danger" onClick={() => { if (confirm('Text löschen?')) updateLesson((l) => { l.texts = l.texts.filter((y) => y.id !== t.id); }); }}>Löschen</button>
          </div>
          <table className="tbl" style={{ marginTop: 8 }}>
            <thead><tr><th>Satz</th><th style={{ width: '25%' }}>Deutsch (optional)</th><th style={{ width: 70 }}>Start (s)</th><th style={{ width: 70 }}>Ende (s)</th><th>Eigenes Audio</th><th></th></tr></thead>
            <tbody>
              {t.sentences.map((s) => (
                <tr key={s.id}>
                  <td><input value={s.fr} onChange={(e) => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id)?.sentences.find((z) => z.id === s.id); if (x) x.fr = e.target.value; })} /></td>
                  <td><input value={s.de ?? ''} onChange={(e) => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id)?.sentences.find((z) => z.id === s.id); if (x) x.de = e.target.value || undefined; })} /></td>
                  <td><input type="number" step="0.1" value={s.start ?? ''} onChange={(e) => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id)?.sentences.find((z) => z.id === s.id); if (x) x.start = e.target.value === '' ? undefined : Number(e.target.value); })} /></td>
                  <td><input type="number" step="0.1" value={s.end ?? ''} onChange={(e) => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id)?.sentences.find((z) => z.id === s.id); if (x) x.end = e.target.value === '' ? undefined : Number(e.target.value); })} /></td>
                  <td>
                    <select value={s.audioId ?? ''} onChange={(e) => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id)?.sentences.find((z) => z.id === s.id); if (x) x.audioId = e.target.value || undefined; })}>
                      <option value="">– Textaudio –</option>
                      {assets.map((a) => <option key={a.id} value={a.id}>{a.fileName ?? a.id}</option>)}
                    </select>
                  </td>
                  <td><button className="btn ghost small" onClick={() => updateLesson((l) => { const x = l.texts.find((y) => y.id === t.id); if (x) x.sentences = x.sentences.filter((z) => z.id !== s.id); })}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn ghost small" onClick={() => updateLesson((l) => { l.texts.find((y) => y.id === t.id)?.sentences.push({ id: newId('s'), fr: '' }); })}>+ Satz</button>
        </div>
      ))}
    </div>
  );
}

// ---------- Audio-Bibliothek ----------

function AudioLibrary({ packId, assets, reload, lesson, updateLesson }: { packId: string; assets: AudioAsset[]; reload: () => Promise<void>; lesson?: Lesson; updateLesson: (fn: (l: Lesson) => void) => void }) {
  const [over, setOver] = useState(false);
  const [splitting, setSplitting] = useState<AudioAsset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const addFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!/^audio\//.test(f.type) && !/\.(mp3|m4a|wav|ogg|aac|flac|webm)$/i.test(f.name)) continue;
      const existing = assets.find((a) => a.fileName === f.name);
      const id = existing?.id ?? newId('a');
      await putAudio({ id, packId, mime: f.type || 'audio/mpeg', blob: f, fileName: f.name });
    }
    await reload();
  };
  return (
    <div className="card">
      <div className="row between">
        <h2 style={{ margin: 0 }}>Audio-Bibliothek ({assets.length})</h2>
        <input ref={fileRef} type="file" accept="audio/*" multiple style={{ display: 'none' }} onChange={(e) => void addFiles(e.target.files)} />
        <button className="btn" onClick={() => fileRef.current?.click()}>Dateien hinzufügen</button>
      </div>
      <div
        className={`dropzone${over ? ' over' : ''}`}
        style={{ marginTop: 8 }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void addFiles(e.dataTransfer.files); }}
      >
        Audiodateien hierher ziehen. Dateinamen wie <span className="kbd">le_college.mp3</span> werden automatisch den Vokabeln zugeordnet („Audio automatisch zuordnen“).
      </div>
      {assets.length > 0 && (
        <ul className="list" style={{ marginTop: 8 }}>
          {assets.map((a) => (
            <li key={a.id}>
              <button className="btn ghost" onClick={async () => { const x = await getAudio(a.id); if (x) void player.play(x.blob); }}><Icon.play /></button>
              <span className="fr">{a.fileName ?? a.id}</span>
              <span className="spacer" />
              <span className="muted small">{Math.round(a.blob.size / 1024)} kB</span>
              {lesson && <button className="btn ghost small" title="Track an Pausen zerteilen und Vokabeln/Sätzen zuordnen" onClick={() => setSplitting(a)}>Zerteilen</button>}
              <button className="btn ghost small" onClick={async () => { await deleteAudio(a.id); await reload(); }}>🗑</button>
            </li>
          ))}
        </ul>
      )}
      {splitting && lesson && <SplitAudio key={splitting.id} asset={splitting} lesson={lesson} updateLesson={updateLesson} onClose={() => setSplitting(null)} />}
    </div>
  );
}

// ---------- Ordner-Import ----------

/**
 * Ordner mit Wortliste und Audio importieren.
 * - im Paket-Editor: Lektionen kommen in das geöffnete Paket
 * - in der Paketübersicht (onPacks): je Einheit („D1 Unité 3“) ein eigenes Paket, für ganze Bände
 */
function BulkImport({ pack, onDone, onPacks }: { pack?: Pack; onDone?: (lessons: Lesson[]) => Promise<void>; onPacks?: (packIds: string[]) => Promise<void> }) {
  const dirRef = useRef<HTMLInputElement>(null);
  const [plan, setPlan] = useState<BulkPlan | null>(null);
  const [title, setTitle] = useState('Import');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [includeUnmatched, setIncludeUnmatched] = useState(true);
  const splitMode = !!onPacks;
  useEffect(() => { if (dirRef.current) dirRef.current.setAttribute('webkitdirectory', ''); }, []);
  const analyze = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setProgress('Dateien werden gelesen …');
    try { setPlan(await planBulkImport(Array.from(files), { defaultLessonTitle: title })); } finally { setBusy(false); setProgress(''); }
  };
  const store = async (assets: AudioAsset[], label: string) =>
    putAudioMany(assets, (done, total) => setProgress(`${label}: ${done} von ${total} Aufnahmen gespeichert …`));
  const run = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      if (splitMode) {
        const groups = groupPlanByBand(plan);
        const now = new Date().toISOString();
        const stamp = Date.now().toString(36);
        const ids: string[] = [];
        for (const [i, g] of groups.entries()) {
          const id = newId('pack');
          const { lessons, assets } = materialize(g.plan, id);
          await store(assets, `${g.title} (${i + 1}/${groups.length})`);
          const band = g.band;
          await savePack({
            id, title: g.title, level: /^D\d$/.test(band) ? `Lernjahr ${band.slice(1)}` : undefined,
            source: pack?.source, rightsNote: 'Lehrwerk-Audio: nur für den eigenen Unterricht, Weitergabe nur mit ausdrücklicher Lizenz.',
            sortKey: `${band}-${stamp}-${String(i).padStart(3, '0')}`,
            formatVersion: PACK_FORMAT_VERSION, createdAt: now, updatedAt: now, lessons,
          });
          ids.push(id);
        }
        await onPacks(ids);
      } else if (onDone) {
        const { lessons, assets } = materialize(plan, pack?.id ?? newId('pack'), { includeUnmatchedAudio: includeUnmatched });
        await store(assets, 'Import');
        await onDone(lessons);
      }
      setPlan(null);
    } finally { setBusy(false); setProgress(''); }
  };
  const units = plan && splitMode ? groupPlanByBand(plan) : null;
  return (
    <div className="card">
      <h2>{splitMode ? 'Band importieren (Ordner)' : 'Ordner importieren'}</h2>
      <p className="muted small">
        Ein Ordner mit Audiodateien und einer Wortliste (CSV/TSV/TXT: „französisch ⇥ deutsch [⇥ Lektion] [⇥ Dateiname] [⇥ Lautschrift]“) wird zu Lektionen mit zugeordnetem Audio.
        {splitMode ? ' Je Band (z. B. „D1“ am Anfang der Spalte Lektion) entsteht ein Paket; die Unités wählt man danach auf der Startseite.' : ' Ohne Liste werden die Dateinamen als Vokabeln übernommen.'}
      </p>
      <div className="row">
        {!splitMode && <label className="field">Lektionstitel (falls die Liste keinen nennt)<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>}
        <input ref={dirRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => void analyze(e.target.files)} />
        <button className="btn" disabled={busy} onClick={() => dirRef.current?.click()}>Ordner wählen …</button>
      </div>
      {progress && <p className="small" role="status">{progress}</p>}
      {plan && (
        <div style={{ marginTop: 10 }}>
          <p className="small">
            {plan.audioFiles.length} Audiodateien · {plan.lessons.reduce((a, l) => a + l.entries.length, 0)} Listeneinträge in {plan.lessons.length} Lektion(en) ·
            {' '}{plan.lessons.reduce((a, l) => a + l.entries.filter((e) => e.file).length, 0)} zugeordnet · {plan.unmatchedRows.length} Einträge ohne Audio · {plan.unmatchedAudio.length} Audiodateien ohne Eintrag
          </p>
          {units && <p className="small">Es entsteht {units.length === 1 ? 'ein Paket' : `${units.length} Pakete`}: {units.map((u) => `${u.title} (${u.plan.lessons.length} Lektionen)`).join(', ')}</p>}
          {plan.unmatchedRows.length > 0 && <p className="muted small">Ohne Audio: {plan.unmatchedRows.slice(0, 15).map((r) => r.fr).join(', ')}{plan.unmatchedRows.length > 15 ? ' …' : ''}</p>}
          {plan.unmatchedAudio.length > 0 && <p className="muted small">Ohne Eintrag: {plan.unmatchedAudio.slice(0, 15).map((f) => f.name).join(', ')}{plan.unmatchedAudio.length > 15 ? ' …' : ''}</p>}
          {!splitMode && <label className="check"><input type="checkbox" checked={includeUnmatched} onChange={(e) => setIncludeUnmatched(e.target.checked)} /> Nicht zugeordnete Audiodateien als eigene Lektion „Nicht zugeordnete Aufnahmen“ anlegen</label>}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn primary" disabled={busy} onClick={() => void run()}>Importieren</button>
            <button className="btn ghost" disabled={busy} onClick={() => setPlan(null)}>Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}

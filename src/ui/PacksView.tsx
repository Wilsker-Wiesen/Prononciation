/** Paketverwaltung: Import (Datei/URL), Export, Löschen. */
import { useRef, useState } from 'react';
import { exportPackZip, importPackFromUrl, importPackZip } from '../content/pack';
import { demoPack } from '../content/demo';
import { navigate, useApp } from '../state/appState';
import { deletePack, savePack } from '../storage/db';
import { download } from './ProgressView';

export function PacksView() {
  const { packs, refreshPacks, settings } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [url, setUrl] = useState('');

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await importPackZip(f);
      await refreshPacks();
      setMsg(`„${r.pack.title}“ importiert (${r.audioCount} Audiodateien).${r.warnings.length ? ' Hinweise: ' + r.warnings.join(' ') : ''}`);
    } catch (e) {
      setMsg(`Import fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onUrl = async () => {
    if (!url.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await importPackFromUrl(url.trim());
      await refreshPacks();
      setMsg(`„${r.pack.title}“ importiert (${r.audioCount} Audiodateien).`);
      setUrl('');
    } catch (e) {
      setMsg(`Import fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>Pakete</h1>
      <div className="card">
        <h2>Paket importieren</h2>
        <p className="muted small">Ein Paket ist eine ZIP-Datei mit Vokabeln, Texten und Audio, die deine Lehrkraft erstellt hat.</p>
        <div className="row">
          <input ref={fileRef} type="file" accept=".zip,application/zip" style={{ display: 'none' }} onChange={(e) => void onFile(e.target.files?.[0])} />
          <button className="btn primary" disabled={busy} onClick={() => fileRef.current?.click()}>ZIP-Datei auswählen</button>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <input placeholder="https://… /paket.zip" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 1, minWidth: 200, padding: 8, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }} />
          <button className="btn" disabled={busy || !url.trim()} onClick={() => void onUrl()}>Von URL laden</button>
        </div>
        {msg && <div className="banner small" style={{ marginTop: 10 }}>{msg}</div>}
      </div>

      {packs.map((p) => (
        <div className="card" key={p.id}>
          <div className="row between">
            <div>
              <h2 style={{ margin: 0 }}>{p.title}</h2>
              <div className="muted small">{p.lessons.length} Lektionen · {[p.level, p.source, p.author].filter(Boolean).join(' · ')}</div>
              {p.rightsNote && <div className="muted small">Rechte: {p.rightsNote}</div>}
            </div>
            <div className="row">
              {settings.teacherMode && <button className="btn" onClick={() => navigate({ name: 'teacher', packId: p.id })}>Bearbeiten</button>}
              <button className="btn" onClick={async () => download(await exportPackZip(p), `${p.title.replace(/[^\p{L}\p{N}]+/gu, '-')}.zip`)}>Exportieren</button>
              <button className="btn danger" onClick={async () => { if (confirm(`Paket „${p.title}“ samt Audio und Lernstand löschen?`)) { await deletePack(p.id); await refreshPacks(); } }}>Löschen</button>
            </div>
          </div>
        </div>
      ))}

      <div className="card flat">
        <div className="row between">
          <span className="muted small">Beispielpaket wiederherstellen</span>
          <button className="btn ghost" onClick={async () => { await savePack(demoPack()); await refreshPacks(); }}>Beispiel anlegen</button>
        </div>
      </div>
    </div>
  );
}

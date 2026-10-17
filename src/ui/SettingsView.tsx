/** Einstellungen: Bewertungsmodell, Datenschutz, Daten auf dem Gerät. */
import { useEffect, useState } from 'react';
import { deleteModelCache, isModelCached, resolveUrl } from '../asr/modelLoader';
import { MODEL_OPTIONS, modelOption } from '../asr/models';
import { loadModel, modelSources, unloadModel, useApp, useModelStatus } from '../state/appState';
import { clearRecordings, storageEstimate } from '../storage/db';
import { formatBytes } from './components';

export function SettingsView() {
  const { settings, updateSettings } = useApp();
  const model = useModelStatus();
  const [cached, setCached] = useState<boolean | null>(null);
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const [advanced, setAdvanced] = useState(false);

  const refresh = () => {
    Promise.all(modelSources(settings).map((src) => isModelCached(src))).then((r) => setCached(r.some(Boolean)));
    storageEstimate().then(setStorage);
  };
  useEffect(refresh, [settings.modelId, settings.modelBaseUrl, settings.modelFile, settings.modelVocabFile, model.state]);

  return (
    <div>
      <h1>Einstellungen</h1>

      <div className="card">
        <h2>Aussprachebewertung</h2>
        <p className="muted small">
          Die Bewertung nutzt ein Phonem-Erkennungsmodell, das einmalig heruntergeladen (≈ 86 MB) und danach auf dem Gerät gespeichert wird.
          Deine Aufnahmen werden ausschließlich auf dem Gerät ausgewertet und nie übertragen.
        </p>
        <label className="check">
          <input type="checkbox" checked={settings.assessmentEnabled} onChange={(e) => void updateSettings({ assessmentEnabled: e.target.checked })} />
          Bewertung der Laute aktivieren
        </label>
        <label className="field" style={{ marginTop: 10 }}>
          Modell
          <select value={settings.modelId} disabled={model.state === 'loading'} onChange={async (e) => { await unloadModel(); void updateSettings({ modelId: e.target.value as typeof settings.modelId }); }}>
            {MODEL_OPTIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <p className="muted small">{modelOption(settings.modelId).description}</p>
        <div className="row" style={{ marginTop: 10 }}>
          <span>
            Status: <b>{model.state === 'ready' ? 'bereit' : model.state === 'loading' ? 'wird geladen' : model.state === 'error' ? 'Fehler' : cached ? 'gespeichert, nicht geladen' : 'nicht heruntergeladen'}</b>
          </span>
          {model.state !== 'ready' && model.state !== 'loading' && (
            <button className="btn primary" onClick={() => void loadModel(settings).catch(() => undefined)}>{cached ? 'Modell laden' : 'Modell herunterladen'}</button>
          )}
          {model.state === 'ready' && <button className="btn" onClick={() => void unloadModel()}>Aus dem Speicher entfernen</button>}
          {cached && (
            <button className="btn danger" onClick={async () => { await unloadModel(); await deleteModelCache(); refresh(); }}>Download löschen</button>
          )}
        </div>
        {model.state === 'loading' && model.progress && model.progress.total > 0 && (
          <div style={{ marginTop: 8 }}>
            <div className="progress"><div style={{ width: `${Math.round((100 * model.progress.loaded) / model.progress.total)}%` }} /></div>
            <div className="small muted">{formatBytes(model.progress.loaded)} / {formatBytes(model.progress.total)}</div>
          </div>
        )}
        {model.state === 'error' && <div className="banner error small" style={{ marginTop: 8 }}>{model.error}</div>}
        <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setAdvanced(!advanced)}>{advanced ? 'Erweitert ausblenden' : 'Erweitert …'}</button>
        {advanced && (
          <div className="stack" style={{ marginTop: 8 }}>
            {settings.modelId === 'custom' ? (
              <>
                <label className="field">
                  Basis-URL (endet mit /)
                  <input value={settings.modelBaseUrl} placeholder="https://schule.example/modelle/" onChange={(e) => void updateSettings({ modelBaseUrl: e.target.value })} />
                </label>
                <label className="field">
                  Modelldatei (ONNX)
                  <input value={settings.modelFile} onChange={(e) => void updateSettings({ modelFile: e.target.value })} />
                </label>
                <label className="field">
                  Vokabulardatei (vocab.json oder tokenizer.json)
                  <input value={settings.modelVocabFile} onChange={(e) => void updateSettings({ modelVocabFile: e.target.value })} />
                </label>
              </>
            ) : (
              <ul className="small muted">
                {modelSources(settings).map((src, i) => (
                  <li key={i}>{i === 0 ? 'Quelle' : 'Ausweichquelle'}: {resolveUrl(src.baseUrl, src.modelFile)}</li>
                ))}
              </ul>
            )}
            <p className="muted small">
              Für Schulnetze ohne Zugriff auf GitHub/Hugging Face können die Modelldateien auf einem eigenen Server abgelegt werden („Eigene Quelle“, siehe Dokumentation).
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Lernen</h2>
        <label className="check">
          <input type="checkbox" checked={settings.showIpa} onChange={(e) => void updateSettings({ showIpa: e.target.checked })} />
          Lautschrift anzeigen
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.ttsFallback} onChange={(e) => void updateSettings({ ttsFallback: e.target.checked })} />
          Ersatzstimme des Geräts verwenden, wenn keine Aufnahme vorliegt
        </label>
        <label className="check">
          <input type="checkbox" checked={settings.keepRecordings} onChange={(e) => void updateSettings({ keepRecordings: e.target.checked })} />
          Letzte eigene Aufnahme je Eintrag behalten (nur auf diesem Gerät)
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => void clearRecordings()}>Alle eigenen Aufnahmen löschen</button>
        </div>
      </div>

      <div className="card">
        <h2>Lehrkraft</h2>
        <label className="check">
          <input type="checkbox" checked={settings.teacherMode} onChange={(e) => void updateSettings({ teacherMode: e.target.checked })} />
          Lehrkraft-Modus (Editor für Pakete anzeigen)
        </label>
      </div>

      <div className="card">
        <h2>Speicher &amp; Datenschutz</h2>
        {storage && storage.quota > 0 && (
          <p className="small">Belegt: {formatBytes(storage.usage)} von {formatBytes(storage.quota)}</p>
        )}
        <p className="muted small">
          Diese App speichert alle Daten (Inhaltspakete, Aufnahmen, Lernstand, Modell) nur lokal im Browser dieses Geräts. Es gibt keinen Server der App,
          keine Konten und keine Übertragung von Aufnahmen. Beim Löschen der Browserdaten werden auch diese Daten entfernt.
        </p>
      </div>
    </div>
  );
}

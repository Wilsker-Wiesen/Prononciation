/**
 * Lokale Datenhaltung in IndexedDB (über `idb`).
 * Alle Inhalte, Aufnahmen und Lernstände bleiben auf dem Gerät.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import {
  DEFAULT_SETTINGS,
  type Attempt,
  type AudioAsset,
  type Pack,
  type Settings,
  type StoredRecording,
} from '../types/content';

interface PrononciationDB extends DBSchema {
  packs: { key: string; value: Pack; indexes: { byUpdated: string } };
  audio: { key: string; value: AudioAsset; indexes: { byPack: string } };
  attempts: { key: string; value: Attempt; indexes: { byItem: string; byTs: string; byPack: string } };
  recordings: { key: string; value: StoredRecording; indexes: { byPack: string } };
  settings: { key: string; value: { key: string; value: Settings } };
}

let dbPromise: Promise<IDBPDatabase<PrononciationDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<PrononciationDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PrononciationDB>('prononciation', 1, {
      upgrade(db) {
        const packs = db.createObjectStore('packs', { keyPath: 'id' });
        packs.createIndex('byUpdated', 'updatedAt');
        const audio = db.createObjectStore('audio', { keyPath: 'id' });
        audio.createIndex('byPack', 'packId');
        const attempts = db.createObjectStore('attempts', { keyPath: 'id' });
        attempts.createIndex('byItem', 'itemId');
        attempts.createIndex('byTs', 'ts');
        attempts.createIndex('byPack', 'packId');
        const rec = db.createObjectStore('recordings', { keyPath: 'itemId' });
        rec.createIndex('byPack', 'packId');
        db.createObjectStore('settings', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

// ---------- Pakete ----------

export async function listPacks(): Promise<Pack[]> {
  const db = await getDb();
  const packs = await db.getAll('packs');
  return packs.sort((a, b) => (a.sortKey ?? a.title).localeCompare(b.sortKey ?? b.title, 'de', { numeric: true }));
}

export async function getPack(id: string): Promise<Pack | undefined> {
  return (await getDb()).get('packs', id);
}

export async function savePack(pack: Pack): Promise<void> {
  pack.updatedAt = new Date().toISOString();
  await (await getDb()).put('packs', pack);
}

/** Löscht ein Paket samt Audio, Aufnahmen und Lernstatistik. */
export async function deletePack(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['packs', 'audio', 'attempts', 'recordings'], 'readwrite');
  await tx.objectStore('packs').delete(id);
  for (const store of ['audio', 'attempts', 'recordings'] as const) {
    const idx = tx.objectStore(store).index('byPack');
    let cursor = await idx.openKeyCursor(id);
    while (cursor) {
      await tx.objectStore(store).delete(cursor.primaryKey);
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}

// ---------- Audio ----------

export async function putAudio(asset: AudioAsset): Promise<void> {
  await (await getDb()).put('audio', asset);
}

/** Viele Audiodateien in Stapeln speichern (ganze Bände: über 1.000 Dateien). */
export async function putAudioMany(assets: AudioAsset[], onProgress?: (done: number, total: number) => void): Promise<void> {
  const db = await getDb();
  const BATCH = 25;
  for (let i = 0; i < assets.length; i += BATCH) {
    const tx = db.transaction('audio', 'readwrite');
    for (const a of assets.slice(i, i + BATCH)) void tx.store.put(a);
    await tx.done;
    onProgress?.(Math.min(i + BATCH, assets.length), assets.length);
  }
}

export async function getAudio(id: string): Promise<AudioAsset | undefined> {
  return (await getDb()).get('audio', id);
}

export async function deleteAudio(id: string): Promise<void> {
  await (await getDb()).delete('audio', id);
}

export async function listAudioForPack(packId: string): Promise<AudioAsset[]> {
  return (await getDb()).getAllFromIndex('audio', 'byPack', packId);
}

// ---------- Versuche / Lernstand ----------

export async function addAttempt(a: Attempt): Promise<void> {
  await (await getDb()).put('attempts', a);
}

export async function listAttemptsForItem(itemId: string): Promise<Attempt[]> {
  const rows = await (await getDb()).getAllFromIndex('attempts', 'byItem', itemId);
  return rows.sort((a, b) => a.ts.localeCompare(b.ts));
}

export async function listAttemptsForPack(packId: string): Promise<Attempt[]> {
  const rows = await (await getDb()).getAllFromIndex('attempts', 'byPack', packId);
  return rows.sort((a, b) => a.ts.localeCompare(b.ts));
}

export async function listAllAttempts(): Promise<Attempt[]> {
  const rows = await (await getDb()).getAll('attempts');
  return rows.sort((a, b) => a.ts.localeCompare(b.ts));
}

export async function clearAttempts(): Promise<void> {
  await (await getDb()).clear('attempts');
}

// ---------- Eigene Aufnahmen ----------

export async function putRecording(r: StoredRecording): Promise<void> {
  await (await getDb()).put('recordings', r);
}

export async function getRecording(itemId: string): Promise<StoredRecording | undefined> {
  return (await getDb()).get('recordings', itemId);
}

export async function clearRecordings(): Promise<void> {
  await (await getDb()).clear('recordings');
}

// ---------- Einstellungen ----------

export async function loadSettings(): Promise<Settings> {
  const row = await (await getDb()).get('settings', 'app');
  return { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await (await getDb()).put('settings', { key: 'app', value: s });
}

/** Grobe Speicherbelegung (für die Einstellungen). */
export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null;
  const e = await navigator.storage.estimate();
  return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
}

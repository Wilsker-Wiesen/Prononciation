/**
 * Hauptthread-Schnittstelle zum Erkennungs-Worker.
 */
import type { RecognizedPhone } from './ctc';
import type { ModelSource } from './modelLoader';
import type { WorkerRequest, WorkerResponse } from './worker';

export type ModelState = 'idle' | 'loading' | 'ready' | 'error';

export interface LoadProgress {
  file: string;
  loaded: number;
  total: number;
}

type Pending = { resolve: (v: WorkerResponse) => void; reject: (e: Error) => void };

export class PhonemeRecognizer {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private progressCbs = new Set<(p: LoadProgress) => void>();
  state: ModelState = 'idle';
  lastError: string | null = null;
  vocabSize = 0;
  /** Tokens des geladenen Modells (für die Abbildung der Zielphone) */
  vocab: Set<string> = new Set();

  onProgress(cb: (p: LoadProgress) => void): () => void {
    this.progressCbs.add(cb);
    return () => this.progressCbs.delete(cb);
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        for (const cb of this.progressCbs) cb(msg);
        return;
      }
      const p = this.pending.get(msg.seq);
      if (!p) return;
      this.pending.delete(msg.seq);
      if (msg.type === 'error') p.reject(new Error(msg.message));
      else p.resolve(msg);
    };
    w.onerror = (e) => {
      this.state = 'error';
      this.lastError = e.message;
      for (const [, p] of this.pending) p.reject(new Error(e.message));
      this.pending.clear();
    };
    this.worker = w;
    return w;
  }

  private send(req: WorkerRequest, transfer: Transferable[] = []): Promise<WorkerResponse> {
    const w = this.ensureWorker();
    return new Promise((resolve, reject) => {
      this.pending.set(req.seq, { resolve, reject });
      w.postMessage(req, transfer);
    });
  }

  async load(source: ModelSource, vocabUrl: string): Promise<void> {
    if (this.state === 'ready') return;
    this.state = 'loading';
    this.lastError = null;
    const threads = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
    try {
      const res = await this.send({ type: 'load', seq: ++this.seq, source, vocabUrl, numThreads: threads });
      if (res.type === 'loaded') { this.vocabSize = res.vocabSize; this.vocab = new Set(res.vocab.map((v) => v.replace(/[ːˈˌ]/g, ''))); }
      this.state = 'ready';
    } catch (e) {
      this.state = 'error';
      this.lastError = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  async recognize(pcm16k: Float32Array): Promise<{ phones: RecognizedPhone[]; ms: number }> {
    if (this.state !== 'ready') throw new Error('Modell ist nicht geladen');
    const copy = new Float32Array(pcm16k); // Original bleibt beim Aufrufer
    const res = await this.send({ type: 'recognize', seq: ++this.seq, pcm: copy }, [copy.buffer]);
    if (res.type !== 'result') throw new Error('Unerwartete Antwort');
    return { phones: res.phones, ms: res.ms };
  }

  async unload(): Promise<void> {
    if (!this.worker) return;
    this.worker.terminate();
    this.worker = null;
    this.state = 'idle';
    this.pending.clear();
  }
}

export const recognizer = new PhonemeRecognizer();

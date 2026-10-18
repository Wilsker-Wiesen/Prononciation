/**
 * Mikrofonaufnahme → Float32-PCM (mono, native Abtastrate des Geräts).
 *
 * Wichtig für iPad/Safari:
 * - start() muss direkt aus einer Nutzergeste (click/touchend) aufgerufen werden.
 *   Der AudioContext wird deshalb synchron am Anfang von start() erzeugt und
 *   resume() noch innerhalb der Geste aufgerufen – erst danach wird auf
 *   getUserMedia gewartet. Ohne Geste bleibt der Kontext "suspended" und
 *   die Aufnahme wäre still.
 * - Die Abtastrate wird nicht vorgegeben: Safari schaltet beim Aktivieren des
 *   Mikrofons gern die Hardware-Rate um (48 kHz → 44,1 kHz). Weicht die Rate des
 *   Mikrofon-Tracks vom Kontext ab, wird der Kontext neu erzeugt. Die Umrechnung
 *   auf 16 kHz übernimmt später resampleTo() aus ./resample.
 * - Erfassung per AudioWorklet (Code inline als Blob-URL), Rückfall auf
 *   ScriptProcessorNode, wenn kein AudioWorklet vorhanden ist.
 * - Parallel läuft ein MediaRecorder auf demselben Mikrofon-Stream. Liefert der
 *   Audio-Graph keine Daten (iOS: Kontext „interrupted“/„suspended“ nach dem
 *   Umschalten der Audio-Sitzung), wird die MediaRecorder-Aufnahme dekodiert.
 */
import { getAudioContextCtor } from './audioContext';
import { decodeAudioFile } from './resample';

export interface RecorderOptions {
  /** Automatischer Stopp nach so vielen Sekunden (Standard 20). */
  maxSeconds?: number;
  /** Pegel-Rückmeldung (~20 Hz): RMS und Spitzenwert der letzten Samples. */
  onLevel?: (rms: number, peak: number) => void;
  /** Laufzeit-Rückmeldung (~10 Hz) in Sekunden. */
  onTick?: (seconds: number) => void;
}

export interface Recording {
  pcm: Float32Array;
  sampleRate: number;
  durationMs: number;
  /** Diagnose: Herkunft der Daten und Zustand des Audio-Kontexts */
  info: { via: 'graph' | 'media-recorder'; graphMs: number; elapsedMs: number; ctxState: string };
}

export type RecorderErrorCode = 'permission-denied' | 'not-found' | 'unsupported' | 'not-recording';

export class RecorderError extends Error {
  readonly code: RecorderErrorCode;
  constructor(code: RecorderErrorCode, message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'RecorderError';
    this.code = code;
  }
}

const DEFAULT_MAX_SECONDS = 20;
const LEVEL_INTERVAL_MS = 50;
const TICK_INTERVAL_MS = 100;
const FLUSH_TIMEOUT_MS = 250;
const PROCESSOR_NAME = 'pcm-capture';

/** Quelltext des Worklet-Prozessors; wird über eine Blob-URL geladen (keine extra Datei nötig). */
const PROCESSOR_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.stopped = false;
    this.port.onmessage = (e) => {
      if (e.data === 'stop') {
        this.stopped = true;
        // kommt garantiert nach allen zuvor gesendeten Chunks an
        this.port.postMessage('done');
      }
    };
  }
  process(inputs) {
    if (this.stopped) return false;
    const input = inputs[0];
    const ch = input && input[0];
    if (ch && ch.length > 0) {
      const copy = new Float32Array(ch);
      this.port.postMessage(copy, [copy.buffer]);
    }
    return true;
  }
}
registerProcessor('${PROCESSOR_NAME}', PcmCaptureProcessor);
`;

type State = 'idle' | 'starting' | 'recording' | 'stopping';

/**
 * Ein Aufnahme-Kontext für alle Aufnahmen. iOS begrenzt die Zahl der Audio-Kontexte und gibt
 * geschlossene nur verzögert frei; ein neuer Kontext je Aufnahme führte nach einigen Versuchen
 * zu Fehlern beim Mikrofonzugriff. Zwischen den Aufnahmen wird der Kontext nur angehalten.
 */
let sharedCtx: AudioContext | null = null;
/** Kontexte, in denen der Worklet-Prozessor schon registriert ist (zweites Registrieren wirft). */
const workletReady = new WeakSet<BaseAudioContext>();

function recordingContext(Ctor: typeof AudioContext): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new Ctor();
  return sharedCtx;
}

export class Recorder {
  private readonly maxSeconds: number;
  private readonly onLevel: RecorderOptions['onLevel'];
  private readonly onTick: RecorderOptions['onTick'];

  private state: State = 'idle';
  private generation = 0;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private sink: GainNode | null = null;

  private chunks: Float32Array[] = [];
  private totalSamples = 0;
  private maxSamples = Infinity;
  private startedAt = 0;
  private levelSumSq = 0;
  private levelPeak = 0;
  private levelCount = 0;

  private levelTimer: ReturnType<typeof setInterval> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private stopPromise: Promise<Recording> | null = null;
  private flushResolve: (() => void) | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaChunks: Blob[] = [];

  static isSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      getAudioContextCtor() !== null
    );
  }

  constructor(opts: RecorderOptions = {}) {
    this.maxSeconds = opts.maxSeconds ?? DEFAULT_MAX_SECONDS;
    this.onLevel = opts.onLevel;
    this.onTick = opts.onTick;
  }

  get isRecording(): boolean {
    return this.state === 'recording';
  }

  /**
   * Fordert Mikrofonzugriff an und beginnt die Aufnahme.
   * Aus einer Nutzergeste heraus aufrufen (siehe Kopfkommentar).
   * Wirft RecorderError mit code 'permission-denied' | 'not-found' | 'unsupported'.
   */
  async start(): Promise<void> {
    if (this.state !== 'idle') throw new Error('Recorder läuft bereits');
    const Ctor = getAudioContextCtor();
    if (!Ctor || !Recorder.isSupported()) {
      throw new RecorderError(
        'unsupported',
        'Mikrofonaufnahme wird nicht unterstützt (Web Audio/getUserMedia fehlen oder keine sichere Verbindung).',
      );
    }

    const gen = ++this.generation;
    this.state = 'starting';
    this.stopPromise = null;
    this.chunks = [];
    this.totalSamples = 0;
    this.resetLevel();

    // Kontext synchron innerhalb der Geste holen und entsperren
    let ctx = recordingContext(Ctor);
    this.ctx = ctx;
    void ctx.resume().catch(() => undefined);

    let stream: MediaStream;
    const constraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } };
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (first) {
      // Ein unerwarteter Fehler (iOS nach mehreren Aufnahmen) ist oft vorübergehend: einmal neu versuchen
      const retry = toRecorderError(first).code === 'unsupported';
      try {
        if (!retry) throw first;
        await new Promise((r) => setTimeout(r, 400));
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        if (gen === this.generation) this.release();
        throw toRecorderError(err);
      }
    }
    if (gen !== this.generation || this.state !== 'starting') {
      // Zwischenzeitlich abgebrochen
      stopTracks(stream);
      return;
    }
    this.stream = stream;

    // Safari: Hardware-Rate kann sich beim Aktivieren des Mikrofons ändern → Kontext neu erzeugen
    const trackRate = stream.getAudioTracks()[0]?.getSettings().sampleRate;
    if (typeof trackRate === 'number' && trackRate > 0 && trackRate !== ctx.sampleRate) {
      // nur bei tatsächlich anderer Rate einmalig ersetzen; danach passt der gemeinsame Kontext
      try {
        const fresh = new Ctor({ sampleRate: trackRate });
        void ctx.close().catch(() => undefined);
        sharedCtx = fresh;
        ctx = fresh;
        this.ctx = fresh;
      } catch {
        /* Rate nicht einstellbar: mit dem bisherigen Kontext weiter (Web Audio rechnet um) */
      }
    }
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    // iOS unterbricht den Kontext, wenn die Audio-Sitzung umschaltet: sofort wieder anwerfen
    ctx.onstatechange = () => {
      if (this.ctx === ctx && this.state === 'recording' && ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => undefined);
    };
    this.startMediaRecorder(stream);

    this.maxSamples = Math.max(1, Math.round(this.maxSeconds * ctx.sampleRate));
    this.source = ctx.createMediaStreamSource(stream);
    // Stumm geschalteter Ausgang: Chrome verarbeitet Knoten nur, wenn sie am Ziel hängen
    this.sink = ctx.createGain();
    this.sink.gain.value = 0;
    this.sink.connect(ctx.destination);

    const worklet = await this.createWorkletNode(ctx);
    if (gen !== this.generation || this.state !== 'starting') {
      this.release();
      return;
    }
    if (worklet) {
      this.workletNode = worklet;
      this.source.connect(worklet);
      worklet.connect(this.sink);
    } else {
      this.scriptNode = this.createScriptNode(ctx);
      this.source.connect(this.scriptNode);
      this.scriptNode.connect(this.sink);
    }

    this.state = 'recording';
    this.startedAt = now();
    if (this.onLevel) this.levelTimer = setInterval(() => this.emitLevel(), LEVEL_INTERVAL_MS);
    if (this.onTick) this.tickTimer = setInterval(() => this.onTick?.((now() - this.startedAt) / 1000), TICK_INTERVAL_MS);
    this.maxTimer = setTimeout(() => void this.stop().catch(() => undefined), this.maxSeconds * 1000);
  }

  /**
   * Beendet die Aufnahme und liefert das PCM. Nach einem automatischen Stopp
   * (maxSeconds) liefert stop() dasselbe Ergebnis.
   */
  stop(): Promise<Recording> {
    if (this.stopPromise) return this.stopPromise;
    if (this.state !== 'recording') {
      return Promise.reject(new RecorderError('not-recording', 'Es läuft keine Aufnahme'));
    }
    this.stopPromise = this.finish();
    return this.stopPromise;
  }

  /** Bricht ab und verwirft alles Aufgenommene. */
  cancel(): void {
    this.generation++;
    this.release();
    this.chunks = [];
    this.totalSamples = 0;
    this.stopPromise = null;
  }

  // --- intern ---------------------------------------------------------------

  private async createWorkletNode(ctx: AudioContext): Promise<AudioWorkletNode | null> {
    if (!ctx.audioWorklet || typeof AudioWorkletNode === 'undefined' || typeof URL === 'undefined') return null;
    if (!workletReady.has(ctx)) {
      const url = URL.createObjectURL(new Blob([PROCESSOR_SOURCE], { type: 'application/javascript' }));
      try {
        await ctx.audioWorklet.addModule(url);
        workletReady.add(ctx);
      } catch {
        return null; // z. B. CSP ohne blob: → ScriptProcessor-Rückfall
      } finally {
        URL.revokeObjectURL(url);
      }
    }
    try {
      const node = new AudioWorkletNode(ctx, PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: 1,
        channelCountMode: 'explicit',
      });
      node.port.onmessage = (e: MessageEvent) => {
        const data: unknown = e.data;
        if (data instanceof Float32Array) this.pushChunk(data);
        else if (data === 'done') this.flushResolve?.();
      };
      return node;
    } catch {
      return null;
    }
  }

  private createScriptNode(ctx: AudioContext): ScriptProcessorNode {
    const node = ctx.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (e) => {
      // Buffer wird vom Browser wiederverwendet → kopieren
      this.pushChunk(new Float32Array(e.inputBuffer.getChannelData(0)));
    };
    return node;
  }

  private pushChunk(chunk: Float32Array): void {
    if (this.state !== 'recording') return;
    this.chunks.push(chunk);
    this.totalSamples += chunk.length;
    for (let i = 0; i < chunk.length; i++) {
      const v = chunk[i]!;
      this.levelSumSq += v * v;
      const a = v < 0 ? -v : v;
      if (a > this.levelPeak) this.levelPeak = a;
    }
    this.levelCount += chunk.length;
    if (this.totalSamples >= this.maxSamples) void this.stop().catch(() => undefined);
  }

  private emitLevel(): void {
    const rms = this.levelCount > 0 ? Math.sqrt(this.levelSumSq / this.levelCount) : 0;
    const peak = this.levelPeak;
    this.resetLevel();
    this.onLevel?.(rms, peak);
  }

  private resetLevel(): void {
    this.levelSumSq = 0;
    this.levelPeak = 0;
    this.levelCount = 0;
  }

  private startMediaRecorder(stream: MediaStream): void {
    this.mediaChunks = [];
    if (typeof MediaRecorder === 'undefined') return;
    try {
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) this.mediaChunks.push(e.data); };
      mr.start();
      this.mediaRecorder = mr;
    } catch {
      this.mediaRecorder = null;
    }
  }

  private stopMediaRecorder(): Promise<Blob | null> {
    const mr = this.mediaRecorder;
    this.mediaRecorder = null;
    if (!mr || mr.state === 'inactive') return Promise.resolve(this.mediaChunks.length ? new Blob(this.mediaChunks) : null);
    return new Promise((resolve) => {
      const done = () => resolve(this.mediaChunks.length ? new Blob(this.mediaChunks, { type: mr.mimeType || this.mediaChunks[0]?.type }) : null);
      const timer = setTimeout(done, 1500);
      mr.onstop = () => { clearTimeout(timer); done(); };
      try { mr.stop(); } catch { clearTimeout(timer); done(); }
    });
  }

  private async finish(): Promise<Recording> {
    this.state = 'stopping';
    this.clearTimers();
    const sampleRate = this.ctx?.sampleRate ?? 48000;
    const ctxState = this.ctx?.state ?? 'none';
    const elapsedMs = now() - this.startedAt;

    const mediaBlob = await this.stopMediaRecorder();
    if (this.stream) stopTracks(this.stream);
    try {
      this.source?.disconnect();
    } catch {
      /* bereits getrennt */
    }

    // Worklet: noch unterwegs befindliche Chunks abwarten
    if (this.workletNode) await this.flushWorklet(this.workletNode);

    const pcm = this.collect();
    this.release();
    const graphMs = (pcm.length / sampleRate) * 1000;
    // Audio-Graph hat weniger als die Hälfte geliefert: MediaRecorder-Aufnahme verwenden
    if (graphMs < elapsedMs * 0.5 && mediaBlob && mediaBlob.size > 0) {
      try {
        const dec = await decodeAudioFile(mediaBlob);
        if (dec.pcm.length > pcm.length) {
          return { pcm: dec.pcm, sampleRate: dec.sampleRate, durationMs: dec.durationMs, info: { via: 'media-recorder', graphMs, elapsedMs, ctxState } };
        }
      } catch {
        /* dann bleibt es bei den Graph-Daten */
      }
    }
    return { pcm, sampleRate, durationMs: graphMs, info: { via: 'graph', graphMs, elapsedMs, ctxState } };
  }

  private flushWorklet(node: AudioWorkletNode): Promise<void> {
    return new Promise<void>((resolve) => {
      let done = false;
      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          this.flushResolve = null;
          resolve();
        }
      }, FLUSH_TIMEOUT_MS);
      this.flushResolve = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        this.flushResolve = null;
        resolve();
      };
      // Chunks dürfen bis zum 'done' noch angenommen werden
      this.state = 'recording';
      try {
        node.port.postMessage('stop');
      } catch {
        this.flushResolve();
      }
    }).then(() => {
      this.state = 'stopping';
    });
  }

  private collect(): Float32Array {
    const total = Math.min(this.totalSamples, this.maxSamples);
    const pcm = new Float32Array(total);
    let offset = 0;
    for (const chunk of this.chunks) {
      if (offset >= total) break;
      const part = offset + chunk.length > total ? chunk.subarray(0, total - offset) : chunk;
      pcm.set(part, offset);
      offset += part.length;
    }
    this.chunks = [];
    this.totalSamples = 0;
    return pcm;
  }

  private clearTimers(): void {
    if (this.levelTimer) clearInterval(this.levelTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.levelTimer = this.tickTimer = this.maxTimer = null;
  }

  /** Gibt Mikrofon, Knoten und Kontext frei. */
  private release(): void {
    this.clearTimers();
    this.flushResolve?.();
    if (this.stream) stopTracks(this.stream);
    for (const node of [this.source, this.workletNode, this.scriptNode, this.sink]) {
      try {
        node?.disconnect();
      } catch {
        /* ignorieren */
      }
    }
    if (this.scriptNode) this.scriptNode.onaudioprocess = null;
    if (this.workletNode) this.workletNode.port.onmessage = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch { /* ignorieren */ }
    }
    this.mediaRecorder = null;
    const ctx = this.ctx;
    this.ctx = null;
    this.stream = this.source = this.workletNode = this.scriptNode = this.sink = null;
    // gemeinsamen Kontext nicht schließen, nur anhalten (spart Akku, nächste Aufnahme setzt fort)
    if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => undefined);
    if (ctx && ctx !== sharedCtx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
    this.state = 'idle';
  }
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function toRecorderError(err: unknown): RecorderError {
  const name = err instanceof Error ? err.name : '';
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return new RecorderError('permission-denied', 'Zugriff auf das Mikrofon wurde abgelehnt.', err);
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return new RecorderError('not-found', 'Kein Mikrofon gefunden.', err);
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new RecorderError('not-found', 'Mikrofon nicht verfügbar (wird evtl. von einer anderen App benutzt).', err);
    default:
      return new RecorderError('unsupported', `Mikrofon nicht verfügbar (${name || 'unbekannter Fehler'}${err instanceof Error && err.message ? `: ${err.message}` : ''}).`, err);
  }
}

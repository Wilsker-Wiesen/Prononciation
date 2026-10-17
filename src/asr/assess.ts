/**
 * Gesamtablauf der Phonem-Bewertung: Zieltext → Zielphone → Alignment mit
 * erkannten Phonen → Punktwerte → didaktische Hinweise.
 */
import { transcribe, type Transcription } from '../phon/g2p';
import { align, alignCost } from './align';
import type { RecognizedPhone } from './ctc';
import { diagnose, findingFor, type Finding } from './diagnostics';
import { buildAlignTargets, scoreAlignment, type ScoreResult } from './score';

export interface Assessment extends ScoreResult {
  transcription: Transcription;
  recognized: RecognizedPhone[];
  recognizedIpa: string;
  findings: Finding[];
  /** Ergebnis des Vergleichs mit einer Kontrastform (z. B. Singular statt Plural) */
  contrast?: { text: string; targetCost: number; contrastCost: number; closerToContrast: boolean };
}

export interface AssessOptions {
  /** Form, mit der die Aufnahme nicht verwechselt werden soll (z. B. „il prend“ zu „ils prennent“) */
  contrast?: string;
}

export function assess(text: string, recognized: RecognizedPhone[], transcription?: Transcription, vocab?: Set<string>, opts: AssessOptions = {}): Assessment {
  const t = transcription ?? transcribe(text);
  const { targets, flat } = buildAlignTargets(t, vocab);
  const ops = align(targets, recognized);
  const score = scoreAlignment(t, targets, flat, recognized, ops);
  const findings = diagnose(t, score);
  const result: Assessment = { ...score, transcription: t, recognized, recognizedIpa: recognized.map((r) => r.ipa).join(''), findings };

  if (opts.contrast && recognized.length) {
    const ct = transcribe(opts.contrast);
    const c = buildAlignTargets(ct, vocab);
    // fakultative Laute (Schwa, fakultative Liaison) nicht berücksichtigen
    const core = (xs: { ipa: string; optional?: boolean }[]) => xs.filter((x) => !x.optional).map((x) => x.ipa).join('');
    const sameSound = core(c.targets) === core(targets);
    if (!sameSound) {
      const targetCost = alignCost(targets, recognized, ops);
      const contrastCost = alignCost(c.targets, recognized, align(c.targets, recognized));
      // Nur bei deutlichem Abstand melden: Die Aufnahme liegt näher an der falschen Form
      const closerToContrast = contrastCost + 0.5 < targetCost;
      result.contrast = { text: opts.contrast, targetCost, contrastCost, closerToContrast };
      if (closerToContrast) {
        const f = findingFor(text, opts.contrast);
        if (!result.findings.some((x) => x.id === f.id)) result.findings.unshift(f);
        else result.findings = [f, ...result.findings.filter((x) => x.id !== f.id)];
        // Punktdeckel: Wer die Kontrastform spricht, kann nicht „gut“ sein
        result.overall = Math.min(result.overall, 60);
      }
    }
  }
  return result;
}

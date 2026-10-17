/**
 * Gesamtablauf der Phonem-Bewertung: Zieltext → Zielphone → Alignment mit
 * erkannten Phonen → Punktwerte → didaktische Hinweise.
 */
import { transcribe, type Transcription } from '../phon/g2p';
import { align } from './align';
import type { RecognizedPhone } from './ctc';
import { diagnose, type Finding } from './diagnostics';
import { buildAlignTargets, scoreAlignment, type ScoreResult } from './score';

export interface Assessment extends ScoreResult {
  transcription: Transcription;
  recognized: RecognizedPhone[];
  recognizedIpa: string;
  findings: Finding[];
}

export function assess(text: string, recognized: RecognizedPhone[], transcription?: Transcription, vocab?: Set<string>): Assessment {
  const t = transcription ?? transcribe(text);
  const { targets, flat } = buildAlignTargets(t, vocab);
  const ops = align(targets, recognized);
  const score = scoreAlignment(t, targets, flat, recognized, ops);
  const findings = diagnose(t, score);
  return { ...score, transcription: t, recognized, recognizedIpa: recognized.map((r) => r.ipa).join(''), findings };
}

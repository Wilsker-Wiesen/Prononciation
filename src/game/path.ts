/** Lernpfad: Missionen in empfohlener Reihenfolge, gegliedert in Etappen. */
import type { PhenomenonId } from '../phon/phenomena';

export interface PathUnit {
  id: string;
  title: string;
  subtitle: string;
  missions: PhenomenonId[];
}

export const PATH: PathUnit[] = [
  { id: 'u1', title: 'Étape 1 · Les bases', subtitle: 'Was man nicht spricht und was neu klingt', missions: ['silent-final', 'silent-e', 'u-ou', 'nasal', 'ch', 'j-zh'] },
  { id: 'u2', title: 'Étape 2 · Ça se lie', subtitle: 'Wörter verbinden', missions: ['liaison', 'h', 'oi', 'eu', 'glide-ui'] },
  { id: 'u3', title: 'Étape 3 · Les verbes', subtitle: 'Konjugierte Formen richtig sprechen', missions: ['ent-ending', 'plural-3', 'verb-endings'] },
  { id: 'u4', title: 'Étape 4 · Pour les pros', subtitle: 'Feinschliff', missions: ['final-voicing', 'r'] },
];

export const PATH_ORDER: PhenomenonId[] = PATH.flatMap((u) => u.missions);

/** Nächste empfohlene Mission: erste ohne Stern, sonst erste unter drei Sternen. */
export function nextMission(stars: Partial<Record<PhenomenonId, number>>): PhenomenonId {
  return PATH_ORDER.find((m) => !(stars[m] ?? 0)) ?? PATH_ORDER.find((m) => (stars[m] ?? 0) < 3) ?? PATH_ORDER[0]!;
}

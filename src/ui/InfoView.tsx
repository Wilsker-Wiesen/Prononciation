/** Kurzinformation zur App. */
import { useEffect, useState } from 'react';
import { loadBuiltinManifest } from '../audio/builtinAudio';

export function InfoView() {
  const [voiceCredit, setVoiceCredit] = useState<string | null>(null);
  useEffect(() => { void loadBuiltinManifest().then((m) => setVoiceCredit(m?.credit ?? null)); }, []);
  return (
    <div>
      <h1>Über Prononciation</h1>
      <div className="card">
        <p>
          <b>Prononciation</b> ist ein Aussprachetrainer für den Französischunterricht der Sekundarstufe I. Lernende hören die Modellaussprache,
          sprechen nach, vergleichen ihre Aufnahme und erhalten eine Rückmeldung zu einzelnen Lauten.
        </p>
        <h3>So funktioniert die Bewertung</h3>
        <ul>
          <li><b>Laute:</b> Ein Spracherkennungsmodell für französische Phoneme (wav2vec2) läuft direkt auf dem Gerät und schreibt auf, welche Laute es hört. Diese werden mit der Ziellautung verglichen.</li>
          <li><b>Ähnlichkeit:</b> Liegt eine Modellaufnahme vor, wird der Klangverlauf (MFCC) beider Aufnahmen mit dynamischer Zeitverzerrung verglichen.</li>
          <li><b>Hinweise:</b> Typische Fehler deutschsprachiger Lernender (stumme Endkonsonanten, Nasalvokale, u/ou, Liaison …) werden erkannt und erklärt.</li>
        </ul>
        <p className="muted small">
          Die Bewertung ist eine Hilfe, kein Urteil: Sie kann sich irren, besonders bei Hintergrundgeräuschen oder sehr leisen Aufnahmen. Im Zweifel entscheidet das Ohr der Lehrkraft.
        </p>
        <h3>Vorbildaussprache</h3>
        <p className="small">
          Vorrang hat immer die Aufnahme aus dem Paket (z. B. Lehrwerk-Audio). Für die eigenen Inhalte der App (Konjugation, Beispiele,
          Minimalpaare) gibt es eine synthetische Vorbildstimme, die vorab mit dem Erkennungsmodell geprüft wurde. Fehlt beides, spricht die Stimme des Geräts.
        </p>
        {voiceCredit && <p className="muted small">Vorbildstimme: {voiceCredit}.</p>}
        <h3>Datenschutz</h3>
        <p className="small">Keine Konten, kein Server, keine Übertragung von Aufnahmen. Alle Daten bleiben auf diesem Gerät.</p>
        <h3>Urheberrecht</h3>
        <p className="small">
          Die App enthält kein Verlagsmaterial. Lehrkräfte stellen Inhalte als Pakete bereit und sind für die Nutzungsrechte der Audiodateien verantwortlich.
        </p>
        <p className="muted small">Quellcode: <a href="https://github.com/Wilsker-Wiesen/Prononciation" target="_blank" rel="noreferrer">github.com/Wilsker-Wiesen/Prononciation</a> · MIT-Lizenz</p>
      </div>
    </div>
  );
}

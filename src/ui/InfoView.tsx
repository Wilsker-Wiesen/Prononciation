/** Kurzinformation zur App. */
export function InfoView() {
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
          <li><b>Laute:</b> Ein Spracherkennungsmodell für Phoneme (wav2vec2, mehrsprachig) läuft direkt im Browser und schreibt auf, welche Laute es hört. Diese werden mit der Ziellautung verglichen.</li>
          <li><b>Ähnlichkeit:</b> Liegt eine Modellaufnahme vor, wird der Klangverlauf (MFCC) beider Aufnahmen mit dynamischer Zeitverzerrung verglichen.</li>
          <li><b>Hinweise:</b> Typische Fehler deutschsprachiger Lernender (stumme Endkonsonanten, Nasalvokale, u/ou, Liaison …) werden erkannt und erklärt.</li>
        </ul>
        <p className="muted small">
          Die Bewertung ist eine Hilfe, kein Urteil: Sie kann sich irren, besonders bei Hintergrundgeräuschen oder sehr leisen Aufnahmen. Im Zweifel entscheidet das Ohr der Lehrkraft.
        </p>
        <h3>Datenschutz</h3>
        <p className="small">Keine Konten, kein Server, keine Übertragung von Aufnahmen. Alle Daten bleiben im Browser dieses Geräts.</p>
        <h3>Urheberrecht</h3>
        <p className="small">
          Die App enthält kein Verlagsmaterial. Lehrkräfte stellen Inhalte als Pakete bereit und sind für die Nutzungsrechte der Audiodateien verantwortlich.
        </p>
        <p className="muted small">Quellcode: <a href="https://github.com/Wilsker-Wiesen/Prononciation" target="_blank" rel="noreferrer">github.com/Wilsker-Wiesen/Prononciation</a> · MIT-Lizenz</p>
      </div>
    </div>
  );
}

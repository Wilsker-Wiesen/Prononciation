# Datenschutz und Urheberrecht

## Datenschutz (DSGVO, Schulkontext NRW)

**Grundsatz: Es gibt keinen Server der App.** Die App besteht aus statischen Dateien (HTML, JavaScript, WebAssembly).
Alle Verarbeitung findet im Browser des jeweiligen Geräts statt.

| Datenart | Wo gespeichert | Übertragung |
| --- | --- | --- |
| Sprachaufnahmen der Lernenden | IndexedDB des Browsers (optional, nur letzte Aufnahme je Eintrag; abschaltbar) | nie |
| Bewertungsergebnisse, Lernstand | IndexedDB des Browsers | nur bei ausdrücklichem Export durch die Person selbst (CSV/JSON) |
| Inhaltspakete (Vokabeln, Texte, Audio der Lehrkraft) | IndexedDB des Browsers | nur beim Import (vom Gerät oder einer vom Nutzer angegebenen URL) |
| Erkennungsmodell | Cache-API des Browsers | einmaliger Download vom selben Server wie die App (GitHub Pages), beim mehrsprachigen Modell ersatzweise huggingface.co, oder von einem Schulserver |
| Name (freiwillig, nur für den Export) | IndexedDB | nie |

Es werden keine Konten angelegt, keine Cookies gesetzt, keine Analyse-/Tracking-Dienste eingebunden.

**Externe Verbindungen** entstehen nur beim Laden der App selbst (Hosting, z. B. GitHub Pages) und beim einmaligen
Modell-Download (vom selben Server wie die App, also GitHub Pages, GitHub Inc., USA; beim mehrsprachigen Modell
ersatzweise huggingface.co, Hugging Face Inc., USA; oder ein selbst gewählter Server). Dabei werden technisch
IP-Adresse und Browserkennung an den jeweiligen Anbieter übermittelt – wie bei jedem Website-Aufruf. Es werden dabei
keine Aufnahmen und keine Inhalte übertragen. Für ein vollständig schulinternes Setup lassen sich App und Modell auf
einem Schulserver hosten (siehe Lehrkraefte.md).

**Ersatzstimme (Text-to-Speech)**: Die App nutzt die Sprachausgabe des Betriebssystems. Auf iOS/macOS und bei lokal
installierten Stimmen auf Android/Windows erfolgt die Synthese auf dem Gerät. Manche Browser/Betriebssysteme nutzen für
einzelne Stimmen Online-Dienste; dann wird der vorzulesende *Text* (nie eine Aufnahme) übertragen. Die Funktion ist
abschaltbar (*Einstellungen*).

**Empfehlung für den Einsatz in NRW** (keine Rechtsberatung): Da keine personenbezogenen Daten an die Schule oder
Dritte übermittelt werden und die Nutzung auf privaten Geräten freiwillig ist, ist nach unserer Einschätzung keine
Einwilligung der Erziehungsberechtigten erforderlich; auf schuleigenen Geräten sollten die Lernenden den Lernstand bei
Gerätewechsel selbst löschen können (*Lernstand → Löschen*, *Einstellungen → Aufnahmen löschen*). Die Datenschutz-
beauftragte bzw. der Datenschutzbeauftragte der Schule sollte diese Beschreibung erhalten. [Schätzung] Je nach
Schulträger kann eine Verfahrensbeschreibung gewünscht sein; dieses Dokument kann als Grundlage dienen.

## Urheberrecht

- Die App enthält **kein Material des Ernst Klett Verlags** oder anderer Verlage. Wortschatz, Texte und Audio eines
  Lehrwerks werden ausschließlich von der Lehrkraft als Paket eingebracht.
- Wortlisten als solche (Vokabel + Übersetzung) sind in der Regel nicht schutzfähig; die redaktionelle Auswahl und
  Anordnung einer Lektion kann es sein. Beim Einsatz innerhalb der eigenen Lerngruppe ist das Risiko gering; eine
  öffentliche Verbreitung von Paketen mit Lehrwerkinhalten sollte unterbleiben.
- **Audiodateien** der Verlage (Vokabel- und Textaufnahmen) sind geschützte Tonaufnahmen. Die Weitergabe an Lernende ist
  nur zulässig, wenn die Lizenz der Schule (z. B. Digitaler Unterrichtsassistent, Schullizenz) dies erlaubt, oder im
  Rahmen der gesetzlichen Erlaubnisse für Unterricht und Lehre (§ 60a UrhG: bis zu 15 % eines Werkes für einen
  abgegrenzten Teilnehmerkreis; vollständige Vokabel-Tracks einer Unité könnten darüber hinausgehen).
  [Wahrscheinlich] Für Klett-Audio ist die sicherste Variante die Nutzung innerhalb geschlossener Schulplattformen
  im Rahmen der erworbenen Lizenz; im Zweifel beim Verlag nachfragen.
- Eigene Aufnahmen (Lehrkraft, Fremdsprachenassistenz) sind unproblematisch und können frei in Pakete übernommen
  werden. Der Rechtehinweis im Paket dokumentiert die Herkunft.
- Das Erkennungsmodell (`facebook/wav2vec2-lv-60-espeak-cv-ft`) steht unter der Lizenz seiner Urheber (Meta AI);
  die App lädt es zur Laufzeit und verbreitet es nicht weiter.

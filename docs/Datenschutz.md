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

**Was öffentlich ist und was nicht.** Öffentlich (GitHub-Repository und die Seite auf github.io) sind ausschließlich der
Programmcode, die eigenen Beispiel- und Konjugationsinhalte und die frei lizenzierten Erkennungsmodelle. Verlagsmaterial
wird nie ins Repository oder auf die Seite geladen: Vokabellisten, Texte und Audiodateien eines Lehrwerks gelangen nur als
Inhaltspaket (ZIP) bzw. Ordner-Import in die App, und zwar lokal auf das jeweilige Gerät. Ob solche Pakete an Lernende
weitergegeben werden dürfen, ist für Lehrwerk-Audio ungeklärt (siehe unten); bis zur Klärung bleiben sie auf den Geräten
der Lehrkraft. Das Repository
schließt die Arbeitsordner `private/`, `klett/` und `schueleraufnahmen/` sowie ZIP-Dateien technisch aus (`.gitignore`).

- Die App enthält **kein Material des Ernst Klett Verlags** oder anderer Verlage. Wortschatz, Texte und Audio eines
  Lehrwerks werden ausschließlich von der Lehrkraft als Paket eingebracht.
- Wortlisten als solche (Vokabel + Übersetzung) sind in der Regel nicht schutzfähig; die redaktionelle Auswahl und
  Anordnung einer Lektion kann es sein. Beim Einsatz innerhalb der eigenen Lerngruppe ist das Risiko gering; eine
  öffentliche Verbreitung von Paketen mit Lehrwerkinhalten sollte unterbleiben.
- **Audiodateien** der Verlage (Vokabel- und Textaufnahmen) sind geschützte Tonaufnahmen. Auf die gesetzliche
  Unterrichtserlaubnis (§ 60a UrhG, 15 % eines Werkes für eine Lerngruppe) kann man sich dabei nicht stützen:
  § 60a Abs. 3 Nr. 3 UrhG nimmt Werke aus, die ausschließlich für den Unterricht an Schulen bestimmt und entsprechend
  gekennzeichnet sind, und dazu gehören Lehrwerke wie *Découvertes* mit ihren Audios. Die Weitergabe an Lernende
  (Moodle/Logineo, Schulcloud, AirDrop) ist daher nur zulässig, wenn die Lizenz der Schule sie ausdrücklich erlaubt.
  Das ist mit Schulleitung oder Verlag zu klären. Bis dahin werden Klett-Pakete nur auf den Geräten der Lehrkraft
  genutzt, etwa zum Vorführen im Unterricht.
- Eigene Aufnahmen (Lehrkraft, Fremdsprachenassistenz) sind unproblematisch und können frei in Pakete übernommen
  werden. Der Rechtehinweis im Paket dokumentiert die Herkunft.
- Das Erkennungsmodell (`facebook/wav2vec2-lv-60-espeak-cv-ft`) steht unter der Lizenz seiner Urheber (Meta AI);
  die App lädt es zur Laufzeit und verbreitet es nicht weiter.

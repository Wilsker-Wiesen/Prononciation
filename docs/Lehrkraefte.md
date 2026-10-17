# Anleitung für Lehrkräfte

## 1. Die App bereitstellen

**iPhone/iPad und Android:** als native App über TestFlight/App Store bzw. APK, siehe [App.md](App.md).

Zusätzlich läuft dieselbe App als Web-App in jedem Browser. Drei Wege:

1. **GitHub Pages** (Standard): Nach dem ersten Push baut der Workflow die App automatisch. Einmalig unter
   *Settings → Pages → Source* „GitHub Actions“ wählen. Adresse: `https://<konto>.github.io/Prononciation/`.
2. **Schulserver / Logineo / Moodle-Dateibereich**: `BASE_PATH=/ npm run build` (oder passender Unterpfad) und den Inhalt
   von `dist/` hochladen. HTTPS ist Pflicht (Mikrofon).
3. **Lokal im Unterricht**: `npm run dev` auf dem Lehrerlaptop; funktioniert nur auf demselben Gerät (localhost).

Lernende öffnen die Adresse im Browser (Safari auf iPad, Chrome/Edge/Firefox auf Laptop und Android) und können die
App über „Zum Home-Bildschirm“ bzw. „App installieren“ wie eine native App ablegen. Nach dem ersten Laden funktioniert
sie offline (außer dem einmaligen Modell-Download).

## 2. Ein Inhaltspaket erstellen

1. *Einstellungen → Lehrkraft-Modus* aktivieren. In der Navigation erscheint „Editor“.
2. *Editor → Neues Paket anlegen*. Titel, Jahrgang, Quelle (nur Hinweis, z. B. „Découvertes 1“) und einen
   Rechtehinweis eintragen, der im Paket mitgegeben wird.
3. **Lektion** anlegen (z. B. „Unité 2 – Au collège“).
4. **Vokabeln**: „Liste einfügen“ – pro Zeile `französisch<Tab>deutsch` oder `französisch – deutsch`. Aus einer
   Tabellenkalkulation kopierte Spalten werden direkt erkannt. Die Lautschrift wird automatisch erzeugt; in der Spalte
   „Lautschrift“ kann sie überschrieben werden (Standard-IPA, z. B. `ʃɑ̃sɔ̃`).
5. **Audio**: Dateien in die Audio-Bibliothek ziehen (MP3, M4A, WAV, OGG). „Audio automatisch zuordnen“ ordnet nach
   Dateiname zu: `le_college.mp3`, `college.mp3`, `Le collège.m4a` passen alle zu „le collège“ (Artikel, Akzente und
   Sonderzeichen werden ignoriert). Nicht erkannte Dateien lassen sich je Vokabel über „Bibliothek …“ wählen.
6. **Texte**: „+ Text“, Fließtext einfügen – Sätze werden an `. ! ?` getrennt. Für ein Gesamt-Audio des Textes
   je Satz Start und Ende in Sekunden eintragen (Audacity/VLC zeigen die Zeiten an), oder je Satz eine eigene
   Audiodatei wählen.
7. **Speichern** und **Als ZIP exportieren**.

### Audio aus dem Lehrwerk

Die Vokabel- und Textaufnahmen des Lehrwerks (Audio-CD, Download im Digitalen Unterrichtsassistenten) sind
urheberrechtlich geschützt. Ob sie an die Lerngruppe weitergegeben werden dürfen, regeln die Lizenzbedingungen des
Verlags bzw. der Schule. Die App stellt nur die Technik bereit; siehe [Datenschutz.md](Datenschutz.md), Abschnitt
Urheberrecht. Eigene Aufnahmen (Lehrkraft, Assistant·e, Muttersprachler·innen aus dem Kollegium) sind rechtlich
unproblematisch und für Lernende oft motivierender.

Technische Hinweise: Einzeldateien pro Vokabel (1–2 s) sind ideal. Lange Vokabeltracks (ein Track pro Unité, wie bei
*Découvertes*) müssen nicht vorab geschnitten werden: In der Audio-Bibliothek den Track mit **„Zerteilen“** öffnen –
die App erkennt die Pausen, zeigt die Abschnitte zum Vorhören und ordnet sie **der Reihe nach** den Vokabeln der
Lektion (oder den Sätzen eines Textes) zu. Stimmt die Anzahl nicht, Mindestpause/Schwelle anpassen oder einzelne
Abschnitte zusammenfassen bzw. entfernen. Die Zuordnung speichert nur Zeitfenster, der Track bleibt eine Datei.

## 3. Pakete verteilen

Die ZIP-Datei über Moodle/Logineo, Schulcloud, E-Mail oder AirDrop an die Lernenden geben. Import in der App:
*Pakete → ZIP-Datei auswählen* oder *Von URL laden* (wenn die Datei auf einer per HTTPS erreichbaren Adresse liegt,
die Cross-Origin-Zugriff erlaubt – bei eigenen Servern `Access-Control-Allow-Origin` setzen; GitHub-Pages-Dateien im
selben Repository gehen immer).

Ein Paket kann jederzeit aktualisiert und erneut importiert werden; gleiche Paket-ID = Ersetzen, der Lernstand bleibt
erhalten.

### Ordner-Import (ganze Bände)

Für große Bestände (z. B. die Vokabelaufnahmen eines ganzen Bandes) gibt es im Editor „Ordner importieren“: Ein Ordner
mit allen Audiodateien und einer Wortliste (CSV/TSV/TXT; Spalten: französisch, deutsch, optional Lektion, optional
Dateiname) wird in einem Schritt zu Lektionen mit zugeordnetem Audio. Die Zuordnung läuft über den Dateinamen
(„le_college.mp3“ ↔ „le collège“) oder die vierte Spalte. Nicht zugeordnete Dateien landen in einer Sammel-Lektion
zum Nachbearbeiten.

## 4. Das Bewertungsmodell

Beim ersten Training lädt die App das Phonem-Erkennungsmodell (≈ 300 MB) von Hugging Face herunter und speichert es im
Browser. Im Schulnetz lohnt es sich, dies einmal vor der Stunde auf jedem Gerät anzustoßen (*Einstellungen → Modell
herunterladen*).

**Modell selbst hosten** (wenn huggingface.co gesperrt ist oder die Bandbreite knapp ist): Die Dateien
`onnx/model_quantized.onnx` aus dem Repository `onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX` auf einen eigenen
HTTPS-Server legen (CORS erlauben) und in *Einstellungen → Erweitert* die Basis-URL eintragen, z. B.
`https://schule.example/modelle/` mit Modelldatei `model_quantized.onnx`. Alternativ den Ordner `public/models/…`
im Repository ergänzen und `modelBaseUrl` in `src/types/content.ts` auf den eigenen Pfad setzen – dann liefert
GitHub Pages das Modell mit aus (Dateien bis 100 MB pro Datei; das int8-Modell muss dafür ggf. mit
`split`/Range-Requests gestückelt werden, siehe Entwicklung.md).

## 5. Im Unterricht

- **Einstieg**: Vokabeln einer Unité im Modus Hören/Nachsprechen, 5 Minuten zu Beginn der Stunde, Kopfhörer.
- **Gezielt**: Mit Tags (z. B. `nasal`, `liaison`, `u-ou`) markierte Einträge als Fokus-Übung; die Lernenden
  vergleichen ihren Lernstand („Woran du noch arbeiten kannst“).
- **Lesen**: Lektionstext Satz für Satz; danach den ganzen Text am Stück vortragen.
- **Reflexion**: Lernende hören eigene Aufnahme und Modell nacheinander und benennen selbst den Unterschied, bevor sie
  die automatische Rückmeldung lesen (fördert Selbstwahrnehmung, relativiert die Maschine).
- **Hausaufgabe**: Die App läuft auf dem privaten Smartphone; ein CSV-Export des Lernstands kann freiwillig gezeigt
  werden – keine Pflicht, keine Bewertung durch die Maschine.

## 6. Häufige Fragen

- *Die Aufnahme ist leer / „zu leise“.* Mikrofonberechtigung prüfen; auf iPads die Stummschaltung; bei Chromebooks
  Systemmikrofon. Die Aussteuerungsanzeige beim Aufnehmen muss sich bewegen.
- *Die Bewertung ist unplausibel.* Hintergrundgeräusche, zu kurzer Abstand zum Mikrofon oder sehr schnelle Sprache.
  Hinweise sind Vorschläge. Die Lautschrift des Eintrags kann im Editor korrigiert werden, wenn das G2P-Modul ein
  seltenes Wort falsch transkribiert.
- *Es gibt keine französische Stimme.* Auf iOS/macOS unter *Einstellungen → Bedienungshilfen → Gesprochene Inhalte*
  bzw. auf Android in den Text-in-Sprache-Einstellungen eine fr-FR-Stimme installieren. Mit Lehrwerk-Audio wird die
  Ersatzstimme nicht gebraucht.

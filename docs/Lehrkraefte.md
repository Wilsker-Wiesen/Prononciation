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

**Pakete mit eigenen Inhalten** (eigene Aufnahmen, eigene Wortlisten) können frei über Moodle/Logineo, Schulcloud,
E-Mail oder AirDrop an die Lernenden gehen. **Pakete mit Lehrwerk-Audio** erst dann, wenn die Schullizenz die Weitergabe
ausdrücklich erlaubt; die gesetzliche Unterrichtserlaubnis greift für Schulbücher nicht (§ 60a Abs. 3 Nr. 3 UrhG,
Einzelheiten in Datenschutz.md). Import in der App:
*Pakete → ZIP-Datei auswählen* oder *Von URL laden* (wenn die Datei auf einer per HTTPS erreichbaren Adresse liegt,
die Cross-Origin-Zugriff erlaubt – bei eigenen Servern `Access-Control-Allow-Origin` setzen; GitHub-Pages-Dateien im
selben Repository gehen immer).

Ein Paket kann jederzeit aktualisiert und erneut importiert werden; gleiche Paket-ID = Ersetzen, der Lernstand bleibt
erhalten.

### Ordner-Import (ganze Bände)

Für große Bestände gibt es zwei Wege:

- **Band importieren** (Lehrkraft-Editor, Paketübersicht): Ein Ordner mit allen Audiodateien und einer Wortliste wird zu
  **einem Paket je Band** („D1 Unité 3 – Vokabeln“ in der Spalte *Lektion* → Paket „Découvertes 1“, Lektion
  „Unité 3 – Vokabeln“). Auf der Startseite stehen die Unités dann zeilenweise mit ihren Teilen.
- **Ordner importieren** (im geöffneten Paket): alle Lektionen in dieses eine Paket.

Wortliste (CSV/TSV/TXT, Kopfzeile wird erkannt): `französisch ⇥ deutsch ⇥ Lektion ⇥ Dateiname ⇥ Lautschrift`.
„deutsch“ darf leer sein (z. B. Sätze aus Lektionstexten). Die Lautschrift aus dem Lehrwerk wird nur angezeigt; bewertet
wird mit der App-eigenen Transkription, weil nur sie Wortgrenzen, stumme Endungen und Liaison kennt. Zuordnung der
Audiodateien über die Spalte *Dateiname*, sonst über den Dateinamen („le_college.mp3“ ↔ „le collège“).

**Schneller ohne Browser:** Das Skript `tools/build-packs.py` baut aus einem Importordner direkt ein fertiges ZIP-Paket
je Band (z. B. „Découvertes 1“, Lektionen „Unité 3 – Vokabeln“ usw.; feste IDs, der Lernstand bleibt bei erneutem Import
erhalten; frühere Einzelpakete je Unité werden beim Import ersetzt). Mit `--per-unit` entsteht wie früher ein Paket je
Unité. Nur Python 3, keine Zusatzpakete:

```bash
python3 tools/build-packs.py "<Importordner>" "<Zielordner außerhalb des Repositorys>"
```

Der Ordner-Import braucht einen Browser auf dem Computer (Safari, Chrome, Edge); iPad und iPhone können keine Ordner
auswählen. Auf das iPad kommen die Pakete als ZIP (per AirDrop an das eigene Gerät); in der App lassen sich unter
*Pakete* mehrere ZIP-Dateien auf einmal auswählen (in der Dateiauswahl oben „Auswählen“ tippen).

## 4. Das Bewertungsmodell

Beim ersten Training lädt die App das französische Phonem-Erkennungsmodell (≈ 122 MB) einmalig von der eigenen
Seite (GitHub Pages) und speichert es auf dem Gerät. Im Schulnetz lohnt es sich, dies einmal vor der Stunde auf jedem
Gerät anzustoßen (*Einstellungen → Modell herunterladen*), am besten im WLAN statt über mobile Daten.

**Modell selbst hosten** (eigener Schulserver): Die Dateien aus dem Release `models-v1` des Repositorys auf einen
HTTPS-Server legen (CORS erlauben) und in *Einstellungen → Erweitert* die Basis-URL eintragen.

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

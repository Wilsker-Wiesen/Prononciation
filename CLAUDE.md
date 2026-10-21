# CLAUDE.md – Übergabe für neue Sitzungen

Aussprachetrainer Französisch („Prononciation“) für die Sekundarstufe I (Lernjahr 1–4, Lehrwerk *Découvertes*, Klett).
Auftraggeber und Nutzer: Jan Wilsker-Wiesen, Lehrer für Französisch und Sport (NRW). App: https://wilsker-wiesen.github.io/Prononciation/

## Arbeitsweise mit Jan

- Antworten auf Deutsch, knapp, mit klaren Überschriften. Erster Satz: Annahme prüfen oder Lücke benennen, nicht zustimmen.
- Konfidenzmarker bei Sachaussagen: [Sicher], [Wahrscheinlich], [Schätzung]. Nur belegte Fakten, Unsicherheit offen sagen.
- Am Ende jeder Arbeitsrunde eine kurze To-do-Liste für Jan.
- Gestaltungs- und Formatentscheidungen selbst treffen; nur bei echten Entscheidungen (Didaktik, Recht, Kosten) fragen.
- Spielelemente bewusst schlank halten: kein Shop, keine Währung, keine Quests, keine Ranglisten (ausdrücklicher Wunsch).

## Harte Regeln

1. **Kein Klett-Material ins Repository oder auf die Pages-Seite.** Weder Wortlisten noch Audio noch Texte, auch nicht als
   Testdaten. Das Repository ist öffentlich. `.gitignore` schließt `private/`, `klett/`, `*.zip` u. a. aus.
2. **Klett-Pakete bleiben vorerst auf Jans eigenen Geräten.** Die Unterrichtserlaubnis § 60a UrhG gilt nicht für Schulbücher
   (Abs. 3 Nr. 3); Weitergabe an Lernende erst, wenn die Schullizenz sie ausdrücklich erlaubt (Klärung durch Jan offen).
3. Keine Pull Requests ohne ausdrücklichen Auftrag; direkt auf `main` arbeiten, wie bisher.
4. Keine Modellbezeichnungen in Commits oder Dateien.

## Architektur (Kurzfassung)

- Vite + React 19 + TypeScript (strict), Vitest, ESLint; PWA über `vite-plugin-pwa`; Daten nur lokal (IndexedDB).
- **Bewertung:** wav2vec2-Phonem-Erkenner (französisch, ONNX int8, 122 MB) im Web Worker (`src/asr/`), eigene Lautschrift
  (`src/phon/g2p.ts`), Ausrichtung und Diagnosen typischer Fehler deutscher Lernender (`src/asr/diagnostics.ts`,
  Fehlerkatalog `docs/Aussprachefehler.md`). Modell liegt im Release `models-v1` und wird beim Deploy nach `/models/` kopiert.
- **Lehrwerk-Lautschrift** (`ipaRef`) wird nur angezeigt. Bewertet wird immer mit der eigenen Transkription, weil nur sie
  Wortgrenzen, stumme Endungen und Liaison markiert. `ipa` ist dagegen eine Vorgabe der Lehrkraft und ersetzt die Transkription.
- **Vorbild abspielen** (`src/audio/modelVoice.ts`): Paket-Aufnahme → vorab erzeugte Vorbildstimme (`public/tts/`, Piper siwis,
  6 Wörter Kokoro; geprüft mit dem Erkenner, alle ≥ 80) → Gerätestimme. Neu erzeugen: Workflow `tts.yml`, übernehmen mit
  `tools/tts-install.py`.
- **Aufnahme** (`src/audio/recorder.ts`): ein gemeinsamer AudioContext für alle Aufnahmen (iOS begrenzt Kontexte),
  parallel MediaRecorder als Rückfall, falls der Audio-Graph keine Daten liefert. Kein `navigator.audioSession` setzen
  (Verdacht: blockiert die Aufnahme auf dem iPad).
- **iOS-Wiedergabe:** ein einmal entsperrtes Audio-Element (`player.ts`, `installAudioUnlock`).
- **Pakete:** ZIP mit `pack.json` + `audio/`. `replaces` ersetzt frühere Pakete beim Import und übernimmt Lernstand (`absorbPacks`).
- **Verteilung:** Standard ist die Web-App über „Zum Home-Bildschirm“ (wie Jans Apps *parteigesicht* und *qui-est-ce*).
  Native Hülle (Capacitor, `ios/`, `android/`) wird mitgebaut; kein Apple-Entwicklerkonto vorhanden und vorerst nicht geplant.
- Design: helle Blautöne (`src/ui/styles.css`, Kontraste ≥ 4,5:1); Lernpfad ab 700 px waagerecht.

## Klett-Daten: Weg von der Quelle zum iPad

```
~/Developer/Prononciation/                      (Jans Mac)
├── Aussprache-App - Audiomaterial Découvertes/ (Klett, privat; Import/Découvertes 1–4/ mit wortliste.tsv + Clips)
├── _Briefkasten/an_Material.md, an_Code.md      (Austausch mit der Material-Sitzung im Cowork-Chat)
├── PROMPT_fuer_Claude_Code.md                   (Übergabe der Material-Sitzung)
├── Pakete/                                      (fertige ZIPs, nie ins Repo)
└── Prononciation/                               (dieses Repository)
```

- `wortliste.tsv`: `französisch ⇥ deutsch ⇥ Lektion ⇥ Audiodateiname ⇥ IPA [⇥ Abschnitt]` (Abschnitt optional, z. B. „Atelier A“ → Zwischenüberschrift); „deutsch“ darf leer sein (Lektionstexte,
  Eigennamen); Lektion wie `D1 Unité 3 – Vokabeln`. Zahlen: D1 1.103, D2 1.096, D3 895, D4 844 Einträge.
- Pakete bauen (auf dem Mac, nur Python-Standardbibliothek), ein Paket je Band:
  `python3 Prononciation/tools/build-packs.py "Aussprache-App - Audiomaterial Découvertes/Import/Découvertes 1" "Pakete/Bände"`
- Aufs iPad: AirDrop, dann in der App unter Pakete mehrere ZIPs auf einmal importieren.
- Mac-Zugriff aus der Cloud: Jan startet `~/.local/bin/claude remote-control` in `~/Developer/Prononciation`; dann
  Sitzung in dieser Umgebung anlegen und ihr Aufträge schicken (Klett-Material bleibt dort).

## Befehle und Prüfung

```bash
npm test            # Vitest (über 250 Tests)
npm run lint        # ESLint
npx tsc -b          # Typprüfung
npm run build       # Produktion; für Browsertests: cp -r public/models dist/ && npx vite preview --port 4173
npm run models      # Erkennungsmodell aus dem Release nach public/models laden
```

- Browsertests mit Playwright gegen `/opt/pw-browsers/chromium` (Mikrofon über eine Attrappe mit WAV-Datei); Server und
  Test im selben Befehl starten, sonst endet der Vorschau-Server.
- Workflows: `deploy.yml` (Pages), `ci.yml`, `model.yml` (Modelle prüfen und veröffentlichen), `tts.yml` (Vorbildstimme),
  `native.yml` (iOS-Simulator-Build, Android-APK).
- Doku: `docs/Konzept.md`, `Lehrkraefte.md`, `Entwicklung.md`, `Datenschutz.md`, `App.md`, `Aussprachefehler.md`, `Gamification.md`.

## Übungen je Lektion

Sprechen (Training), Hörverstehen (`src/game/listening.ts`, `ListeningView`), Satzpuzzle (`src/game/puzzle.ts`,
`PuzzleView`, nur Sätze mit 3–10 Wörtern). Lektionsart „Vokabeln“/„Einzelsätze“ aus Titel oder Inhalt (`lessonKind.ts`);
Abschnitte in Buchreihenfolge (`groupBySection`). Abschnittsnamen nur so, wie das Buch sie setzt (Material-Sitzung, 21.10.2026).

## Offene Punkte (Stand 21.10.2026)

- iPad-Test durch Jan: 10 Aufnahmen hintereinander (nach Umbau auf gemeinsamen AudioContext); Meldungstext bei Fehlern erfragen.
- Band-Pakete mit Spalte „Abschnitt“ neu bauen und importieren.
- Lizenzfrage Klett (Schulleitung oder Verlag) vor jeder Weitergabe an Lernende.
- Lernstand-Steuerung: Inhalte nur bis zum aktuellen Stand im Buch anbieten (Buchreihenfolge ist in den Paketen erhalten).
- Bewertung mit echten Schüleraufnahmen nachkalibrieren (bisher Lingua Libre und synthetische Proben).

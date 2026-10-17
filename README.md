# Prononciation – Aussprachetrainer Französisch

Eine App für den Französischunterricht der Sekundarstufe I: Schülerinnen und Schüler hören die
Modellaussprache von Vokabeln und Lektionstexten, sprechen nach, hören ihre eigene Aufnahme im Vergleich
und erhalten eine Rückmeldung zu einzelnen Lauten – vollständig auf dem Gerät, ohne Server, ohne Konten,
ohne Übertragung von Sprachaufnahmen.

Läuft als **native App auf iPhone und iPad** (TestFlight/App Store), als **Android-App** und als
**Web-App** in jedem aktuellen Browser (Chromebook, Windows, Mac). Siehe [docs/App.md](docs/App.md).

> Arbeitstitel „Prononciation“. Stand: Oktober 2026, Version 0.1 (Prototyp).

## Was die App kann

| Modus | Beschreibung |
| --- | --- |
| **Hören** | Modellaufnahme (z. B. Lehrwerk-Audio, von der Lehrkraft bereitgestellt) normal oder verlangsamt abspielen. Ohne Aufnahme springt die Sprachausgabe des Geräts ein (fr-FR-Stimme). |
| **Nachsprechen** | Eigene Aufnahme per Mikrofon, Wiedergabe im direkten Vergleich mit dem Modell, Wellenformen nebeneinander. |
| **Vergleichen** | Akustische Ähnlichkeit zur Modellaufnahme (MFCC + Dynamic Time Warping) und Tempo-Rückmeldung. |
| **Bewerten** | Phonem-Erkennung im Browser (wav2vec2, mehrsprachig) → Abgleich mit der Ziellautung → Punktwert pro Laut, Wort und Äußerung; Buchstaben im Wort werden entsprechend eingefärbt. |
| **Hinweise** | Didaktische Diagnose typischer Fehler deutschsprachiger Lernender (stumme Endkonsonanten, Verbendung -ent, Nasalvokale, u/ou, [ʒ], Liaison, Auslautverhärtung, h, ui …) mit Erklärung und Tipp. |
| **Lesen** | Lektionstexte Satz für Satz üben, mit Zeitfenstern im Gesamt-Audio oder eigenen Satz-Audios. |
| **Lernstand** | Versuche, Bestwerte, häufigste Fehlertypen; Export als CSV/JSON (freiwillig, lokal). |
| **Spielwelt** (bewusst schlank) | Maskottchen Coco le coq, Tagesziel mit Fortschrittsring, Serie (Wochenenden zählen nicht), Bonus für Verbesserung, Lernpfad mit Sternen, 60-Sekunden-Ohren-Blitz, Abzeichen, Konfetti und Töne (abschaltbar). Kein Shop, keine Währung, keine Ranglisten, keine Strafen, keine Benachrichtigungen. |
| **Missionen** | Spielerische Fokus-Einheiten je Aussprache-Regel (stumme Enden, -ent, Nasale, u/ou, Liaison, [ʒ], ch, h, ui, eu, oi, r): Regel → Hörquiz mit Minimalpaaren → Sprechrunde mit Wörtern aus den eigenen Lektionen → Sterne. Punkte, Level, Übungsserien und Abzeichen. |
| **Konjugation** | Eingebautes Paket mit 42 Verben im Präsens (252 Formen), gegliedert danach, ob die 3. Person Plural hörbar ist (ils parlent = il parle; ils‿aiment; ils prennent ≠ il prend). Prüfung, ob eine Pluralform wie der Singular klang. |
| **Lehrkraft-Editor** | Pakete mit Lektionen, Vokabeln (Listen einfügen, Ordner-Import), Texten (Fließtext → Sätze), Audio-Zuordnung (Drag & Drop, automatische Zuordnung über Dateinamen, Zerteilen langer Tracks an Pausen), Lautschrift-Korrektur, Export als ZIP. |

## Schnellstart

```bash
npm install
npm run dev        # Entwicklungsserver, http://localhost:5173/Prononciation/
npm test           # Unit-Tests (G2P, Bewertung, DSP, Audio)
npm run build      # Produktions-Build nach dist/
```

Veröffentlichung auf GitHub Pages: Der Workflow `.github/workflows/deploy.yml` baut bei jedem Push auf `main`
und veröffentlicht `dist/`. Voraussetzungen: Das Repository muss **öffentlich** sein (bei privaten Repositories
sind weder Pages noch Release-Downloads ohne Anmeldung erreichbar), und einmalig wird unter
*Settings → Pages → Source* „GitHub Actions“ gewählt. Die App ist dann unter
`https://<konto>.github.io/Prononciation/` erreichbar.

## Erkennungsmodelle

Der Workflow `.github/workflows/model.yml` („Modelle beschaffen und prüfen“, manuell startbar) lädt das mehrsprachige
Phonem-Modell von Hugging Face, exportiert zusätzlich ein rein französisches wav2vec2-Modell nach ONNX, prüft beide
mit synthetischer Sprache und mit echten Wortaufnahmen (Lingua Libre, CC BY-SA) und veröffentlicht die Dateien als
GitHub-Release `models-v1`. Beim Bau der Seite kopiert `scripts/fetch-models.mjs` die Modelldateien aus dem Release nach
`/models/`, so dass sie vom selben Ursprung wie die App kommen (direkte Release-Links scheitern im Browser, weil GitHub
dort keinen CORS-Header sendet). Für die lokale Entwicklung: `npm run models`. Prüfberichte liegen dem Release bei.

Die App funktioniert nur über HTTPS (oder `localhost`), weil Mikrofonzugriff und Service Worker das verlangen.

## Dokumentation

- [docs/Konzept.md](docs/Konzept.md) – Didaktisches und technisches Konzept, Bewertungsverfahren, Grenzen
- [docs/Lehrkraefte.md](docs/Lehrkraefte.md) – Anleitung für Lehrkräfte: Pakete erstellen, Audio zuordnen, verteilen, Modell selbst hosten
- [docs/Datenschutz.md](docs/Datenschutz.md) – Datenschutz und Urheberrecht (DSGVO, Schulkontext NRW, Verlagsmaterial)
- [docs/Gamification.md](docs/Gamification.md) – Recherche: warum Duolingo motiviert, was die Forschung zu Gamification sagt, Empfehlungen
- [docs/Aussprachefehler.md](docs/Aussprachefehler.md) – Forschungsmemo: typische Fehler deutschsprachiger Lernender, Minimalpaare, Didaktik, Grenzen automatischer Bewertung
- [docs/Entwicklung.md](docs/Entwicklung.md) – Architektur, Module, Tests, Roadmap

## Inhalte und Rechte

Die App enthält **kein Verlagsmaterial**. Vokabellisten, Texte und Audiodateien eines Lehrwerks (z. B. *Découvertes*)
bringt die Lehrkraft als *Inhaltspaket* (ZIP) selbst ein und ist für die Einhaltung der Nutzungsrechte verantwortlich.
Ein kleines Beispielpaket mit eigenen Sätzen (ohne Audio) ist enthalten.

## Lizenz

MIT (siehe [LICENSE](LICENSE)). Das Entwicklungswerkzeug `tools/espeak-reference.mjs` verwendet den GPL-lizenzierten
eSpeak-NG-Build `@echogarden/espeak-ng-emscripten` ausschließlich zur Kalibrierung; er ist nicht Teil der App.
Das Erkennungsmodell `facebook/wav2vec2-lv-60-espeak-cv-ft` (ONNX-Export: `onnx-community`) wird zur Laufzeit geladen
und unterliegt der Lizenz seiner Urheber.

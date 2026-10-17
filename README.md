# Prononciation – Aussprachetrainer Französisch

Eine Web-App (PWA) für den Französischunterricht der Sekundarstufe I: Schülerinnen und Schüler hören die
Modellaussprache von Vokabeln und Lektionstexten, sprechen nach, hören ihre eigene Aufnahme im Vergleich
und erhalten eine Rückmeldung zu einzelnen Lauten – vollständig im Browser, ohne Server, ohne Konten,
ohne Übertragung von Sprachaufnahmen.

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
| **Lehrkraft-Editor** | Pakete mit Lektionen, Vokabeln (Listen einfügen), Texten (Fließtext → Sätze), Audio-Zuordnung (Drag & Drop, automatische Zuordnung über Dateinamen), Lautschrift-Korrektur, Export als ZIP. |

## Schnellstart

```bash
npm install
npm run dev        # Entwicklungsserver, http://localhost:5173/Prononciation/
npm test           # Unit-Tests (G2P, Bewertung, DSP, Audio)
npm run build      # Produktions-Build nach dist/
```

Veröffentlichung auf GitHub Pages: Der Workflow `.github/workflows/deploy.yml` baut bei jedem Push auf `main`
und veröffentlicht `dist/`. Einmalig im Repository unter *Settings → Pages → Source* „GitHub Actions“ wählen.
Die App ist dann unter `https://<konto>.github.io/Prononciation/` erreichbar.

Die App funktioniert nur über HTTPS (oder `localhost`), weil Mikrofonzugriff und Service Worker das verlangen.

## Dokumentation

- [docs/Konzept.md](docs/Konzept.md) – Didaktisches und technisches Konzept, Bewertungsverfahren, Grenzen
- [docs/Lehrkraefte.md](docs/Lehrkraefte.md) – Anleitung für Lehrkräfte: Pakete erstellen, Audio zuordnen, verteilen, Modell selbst hosten
- [docs/Datenschutz.md](docs/Datenschutz.md) – Datenschutz und Urheberrecht (DSGVO, Schulkontext NRW, Verlagsmaterial)
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

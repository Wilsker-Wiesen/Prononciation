# Konzept: Prononciation

## 1. Ausgangslage und Ziel

Aussprache wird im Französischunterricht der Sekundarstufe I selten systematisch geübt: Die Unterrichtszeit ist knapp,
individuelle Rückmeldung für 25–30 Lernende ist im Plenum kaum möglich, und Lernende hören sich selbst selten bewusst
zu. Zugleich sind die Fehlerquellen für deutschsprachige Lernende gut beschrieben und über Jahre stabil
(stumme Endkonsonanten, Nasalvokale, [y] vs. [u], [ʒ], uvulares [ʁ], Liaison, Auslautverhärtung).

Die App soll drei Dinge leisten:

1. **Exposition und Imitation** – Modellaussprache (Lehrwerk-Audio) hören, verlangsamen, nachsprechen, die eigene Aufnahme
   unmittelbar im Vergleich hören (Audiospiegel).
2. **Rückmeldung ohne Lehrkraft** – eine automatische, erklärende Bewertung der Aussprache auf Lautebene, die zu
   gezielter Wiederholung anregt, ohne Noten zu vergeben.
3. **Datenschutz und Unterrichtstauglichkeit** – keine Konten, keine Cloud-Verarbeitung von Kinderstimmen, Nutzung auf
   Schul-iPads, privaten Smartphones und Laptops, offline-fähig nach dem ersten Laden.

## 2. Didaktisches Design

### Lernschleife

Hören → Nachsprechen → (Vergleich hören) → Rückmeldung → gezielt wiederholen. Die Schleife ist pro Eintrag kurz
(10–30 Sekunden) und kann im Vokabel- wie im Textmodus durchlaufen werden.

### Rückmeldung

- **Ampellogik** (grün ≥ 85, gelb 65–84, rot < 65) auf drei Ebenen: Äußerung, Wort, Laut. Buchstaben im Wort werden
  nach der Bewertung der zugehörigen Laute eingefärbt – Lernende sehen *wo* im Wort der Fehler liegt.
- **Diagnosen mit Erklärung** statt bloßer Punktzahl. Jede Diagnose nennt das betroffene Wort, den erwarteten und den
  gehörten Laut, eine Regel in Lernendensprache und einen Übungstipp (z. B. „bon – bonne“ als Minimalpaar).
- **Fehlertoleranz** der Bewertung: fakultative Laute (Schwa, fakultative Liaison) werden nicht bestraft; Ersetzungen
  werden nach artikulatorischer Nähe abgestuft bewertet ([e]/[ɛ] kostet wenig, [y]/[u] viel).
- **Keine Notenfunktion.** Der Lernstand bleibt bei den Lernenden; ein Export ist freiwillig.

### Missionen (spielerischer Kern)

Die Forschung (siehe *Aussprachefehler.md*) zeigt, dass die dominante Fehlerquelle in der Sekundarstufe I die
„Leseaussprache“ ist: Lernende sprechen, was dasteht. Dagegen hilft Kognitivierung, also explizite Schrift-Laut-Regeln,
gekoppelt mit Hören und Sprechen. Genau so sind die Missionen gebaut:

1. **Regel verstehen** – eine Regel in Lernendensprache, ein Artikulationstipp, der typische Fehler, drei Hörbeispiele
   (bevorzugt aus dem eigenen Lehrwerk-Audio).
2. **Hören** – sechs Aufgaben „Welches Wort hörst du?“ mit Minimalpaaren des Phänomens (tu/tout, bon/bonne,
   petit/petite, vin/vent …) oder Wörtern der eigenen Lektionen.
3. **Sprechen** – fünf Wörter des Phänomens aus den geladenen Lektionen, bewertet wie im Training, mit dem Fokus-Tipp.
4. **Sterne** (1–3 nach Hör- und Sprechleistung), Punkte, Level, Serien (Tage in Folge) und Abzeichen („Nasal-Profi“,
   „tu ≠ tout“ …). Keine Ranglisten, kein Vergleich zwischen Lernenden.

Die Zuordnung von Wörtern zu Phänomenen erfolgt automatisch über das G2P-Modul (z. B. „enthält Nasalvokal“, „stummer
Endkonsonant“, „obligatorische Liaison“), so dass jede importierte Découvertes-Unité sofort Missionen speist.

### Konjugation (eingebautes Paket)

Das Lektionsvokabular enthält fast nur Infinitive; die am besten belegte Fehlerquelle der Sekundarstufe I liegt aber in
den konjugierten Formen (Pro²F: *ils aiment* als \*[ɛmɑ̃] bis ins 6. Lernjahr). Die App bringt deshalb ein eigenes Paket
„Konjugation – Präsens“ mit 42 häufigen Verben in vollständigen Paradigmen (252 Formen, alle G2P-geprüft), gegliedert
nach dem Merkmal, das für die Aussprache entscheidet:

| Gruppe | Beispiel | 3. Person Plural hörbar? |
| --- | --- | --- |
| -er-Verben | il parle – ils parlent | nein, identisch [il paʁl] |
| -er-Verben mit Vokalanlaut | il aime – ils‿aiment | nur über die Liaison [ilzɛm] |
| eigener Pluralstamm | il prend – ils prennent, il peut – ils peuvent, il finit – ils finissent | ja, am Stammkonsonanten |
| Sonderfälle | il a – ils‿ont, il est – ils sont, il voit – ils voient | teils ja, teils nein |

Bei Pluralformen mit hörbarem Unterschied prüft die Bewertung zusätzlich, ob die Aufnahme näher an der Singularform liegt
(Vergleich der Alignmentkosten beider Kandidaten, analog zu einer Minimalpaar-Entscheidung). Ist das der Fall, erscheint
der Hinweis „klang eher wie der Singular“, und die Punktzahl ist auf 60 begrenzt. Die Mission „3. Person Plural“ übt
dasselbe als Hörquiz „Singular oder Plural?“, inklusive gleich klingender Paare als Kontrollaufgaben.

Grenze: Für die Konjugationsformen gibt es keine Lehrwerk-Aufnahmen; zum Hören dient die Gerätestimme, ein
Klangvergleich mit einer Modellaufnahme entfällt. Die Lautbewertung funktioniert unabhängig davon.

### Lehrwerkbezug

Inhalte werden als *Pakete* organisiert (Lehrwerk → Band → Unité/Lektion → Abschnitt), so dass die App die Struktur
von *Découvertes* abbilden kann, ohne Verlagsinhalte zu enthalten. Die Lehrkraft entscheidet, welche Vokabeln und
Texte in welcher Reihenfolge angeboten werden, und kann die automatische Lautschrift korrigieren.

## 3. Technisches Konzept

### Architektur (alles im Browser)

```
Text ──G2P (Regeln + Lexikon)──► Zielphone (IPA, Graphemspannen, Liaison, fakultative Laute)
                                        │
Mikrofon ──AudioWorklet──► PCM ──16 kHz──┼──► wav2vec2 (ONNX, Web Worker) ──CTC──► erkannte Phone
                                        │                                              │
                                        └──────────── Alignment (Needleman-Wunsch) ◄───┘
                                                              │
                                        Punktwerte, Diagnosen, Markierung im Wort
Modell-Audio ──MFCC──┐
Eigene Aufnahme ─MFCC┴──► DTW ──► Ähnlichkeit, Tempo
```

### Graphem-Phonem-Umsetzung (src/phon)

Ein regelbasierter Transducer (≈ 200 Regeln mit Links-/Rechtskontext) plus ein Ausnahmelexikon (≈ 500 Einträge:
Funktionswörter, Zahlen, Lehnwörter, Sonderfälle) erzeugt die Ziellautung. Behandelt werden u. a. Nasalkontexte,
offenes/geschlossenes e/o/eu nach Silbenstruktur, stumme Endkonsonanten, -ent als Verbendung (Kontextheuristik),
-tion/-tiel, ill/il, Gleitlaute, Elision, Bindestrichformen, Zahlwörter und **Liaison** (obligatorisch/fakultativ/verboten
nach Wortklasse, h aspiré, Entnasalierung von bon/certain/ancien …). Jedes Phon trägt die Zeichenspanne im Text, so dass
Bewertungen auf Buchstaben abgebildet werden können.

Kalibrierung: Gegen eSpeak NG (dessen Transkriptionen auch das Erkennungsmodell gelernt hat) erreicht das Modul auf
einem Testkorpus von 970 Wörtern und Wendungen 93 % exakte Übereinstimmung; die verbleibenden Abweichungen sind
überwiegend Konventionsunterschiede ([ɔ] vs. [o] in offener Silbe, bei denen die App der Wörterbuchnorm folgt) oder
Fehler von eSpeak. 113 Unit-Tests sichern Standardfälle ab.

### Phonemerkennung (src/asr)

- Modelle (wählbar): `facebook/wav2vec2-lv-60-espeak-cv-ft` (300 M Parameter, 60 Sprachen, eSpeak-Phonemsatz, ONNX
  int8 ≈ 190 MB) und `Cnam-LMSSC/wav2vec2-french-phonemizer` (95 M Parameter, nur Französisch, Common Voice 13,
  MIT; vom Workflow nach ONNX exportiert und in den MatMul-Operatoren int8-quantisiert, ≈ 120 MB, rund dreimal schneller).
  Beide laufen mit onnxruntime-web (WebAssembly, SIMD) in einem Web Worker; der Download wird in der Cache-API abgelegt.
  Die Abbildung der Zielphone auf den Zeichensatz des jeweiligen Modells ist vokabularabhängig (ipa.ts).
- Prüfstand: `tools/validate-model.mjs` bewertet ein Modell unter Node mit demselben Code wie die App, wahlweise mit
  eSpeak-synthetisierten Testwörtern oder mit echten Aufnahmen (WAV-Ordner). Ergebnisse (GitHub Actions, 17.10.2026):

  | Modell | eSpeak-Synthese (60 Wörter) | echte Wortaufnahmen, Lingua Libre (10 Wörter) | Zeit je Wort (CPU) |
  | --- | --- | --- | --- |
  | wav2vec2-french-phonemizer (120 MB) | 50,5 Punkte | **81,8 Punkte**, 8/10 ≥ 65; Nasale korrekt (bonjour → [bɔ̃ʒo], garçon → [ɡaʁsɔ̃]) | ≈ 120 ms |
  | wav2vec2-lv-60-espeak (190 MB) | 44,8 Punkte | 65,9 Punkte, 5/10 ≥ 65 | ≈ 350 ms |

  Die Lingua-Libre-Aufnahmen enthalten nur das nackte Wort (ohne Artikel), die Zielwörter des Prüfstands teils mit
  Artikel; die Werte unterschätzen die Modelle daher etwas. Das französische Modell ist deshalb Standard; das
  mehrsprachige bleibt als Vergleich wählbar. Eine Validierung mit echten Schüleraufnahmen und Lehrkraft-Ratings
  steht aus (siehe Aussprachefehler.md, Abschnitt 5).
- Vorverarbeitung: 16 kHz Mono, Mittelwert/Varianz-Normierung, Stille-Beschneidung.
- Dekodierung: CTC-Greedy mit Konfidenz je Phon (mittlere Softmax-Wahrscheinlichkeit).
- Alignment: globales Alignment der Zielphone (in den eSpeak-Zeichensatz abgebildet: ɥ→y, ɲ+V→nj) mit den erkannten
  Phonen; Ersetzungskosten aus artikulatorischen Merkmalen (Höhe, Vorne/Hinten, Rundung, Nasalität; Ort, Art,
  Stimmhaftigkeit), geringe Kosten für Auslassung fakultativer Laute und für eingefügte Schwas.
- Bewertung: Phon = 100 × (1 − Distanz) × Konfidenzfaktor; Wort/Äußerung = Mittel der bewerteten Phone, Abzug für
  Einfügungen. Gesamtwert = 0,7 × Lautbewertung + 0,3 × akustische Ähnlichkeit (wenn Modell-Audio vorliegt).
- Diagnose: Musterregeln über dem Alignment (z. B. Einfügung eines Konsonanten nach einem Wort mit stummem Endbuchstaben
  → „Stummer Endkonsonant“), sortiert nach didaktischer Relevanz.

### Akustischer Vergleich (src/dsp)

MFCC (13 Koeffizienten + Deltas, CMN) beider Aufnahmen, DTW mit Sakoe-Chiba-Band, Ähnlichkeit = 100·exp(−k·Distanz).
Die Skalierung ist eine Heuristik, die an echten Schüleraufnahmen nachjustiert werden sollte (siehe Roadmap). Das
Dauerverhältnis liefert die Tempo-Rückmeldung.

## 4. Grenzen und Risiken (ehrlich)

- **Die Lautbewertung ist ein Schätzverfahren.** Das Modell wurde nicht auf Kinderstimmen oder Lernersprache trainiert;
  Hintergrundgeräusche, leise Aufnahmen und Billigmikrofone verschlechtern die Erkennung. Ein roter Laut ist ein
  Hinweis, kein Urteil. [Wahrscheinlich] Die Trefferquote der Diagnosen liegt bei deutlichen Fehlern hoch, bei
  subtilen Vokalqualitäten (e/ɛ, o/ɔ) niedrig – deshalb werden diese nur als „Hinweis“ ohne Abzug markiert.
- **Modellgröße.** Der einmalige Download von ≈ 300 MB ist in Schulnetzen ein Hindernis; die Modelldatei kann auf einem
  Schulserver gehostet werden (Einstellungen → Erweitert). Ohne Modell funktionieren Hören, Nachsprechen und der
  akustische Vergleich weiterhin.
- **Rechenzeit.** Auf einem aktuellen iPad/Laptop dauert die Erkennung einer kurzen Äußerung ca. 1–3 s (WASM, ein
  Thread auf GitHub Pages, da ohne COOP/COEP-Header kein Multithreading möglich ist). Auf älteren Geräten länger.
- **Prosodie** (Wortakzent, Intonation) wird nur indirekt über den DTW-Vergleich erfasst, nicht bewertet.
- **G2P-Restfehler** bei seltenen Wörtern und Eigennamen; die Lehrkraft kann die Lautschrift je Eintrag überschreiben.

## 5. Roadmap

1. Erprobung mit einer Lerngruppe; Kalibrierung der Ähnlichkeitsskala und der Bewertungsgewichte an echten Aufnahmen.
2. Minimalpaar-Übungen (tu/tout, bon/bonne, dessus/dessous) als eigener Modus mit Hörverstehen vor dem Sprechen.
3. Wortakzent und Satzmelodie (Tonhöhenverlauf des Modells vs. eigene Aufnahme, visualisiert).
4. Optionales, kleineres Modell (wav2vec2-base, ≈ 95 MB) als Alternative für schwache Geräte.
5. Lehrkraft-Auswertung: freiwilliger Import der CSV-Exporte der Lernenden zur Übersicht häufiger Fehler in der
   Lerngruppe.

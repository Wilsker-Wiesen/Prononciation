# Gamification: Was wir von Duolingo lernen können und was nicht

*Recherche-Memo, Stand Oktober 2026. Konfidenz: **[Sicher]** = Primärquelle oder mehrere unabhängige Quellen; **[Wahrscheinlich]** = eine seriöse Quelle oder Sekundärzusammenfassung; **[Schätzung]** = eigene Ableitung.*

> **Methodischer Hinweis:** Fast alle Websites (blog.duolingo.com, Verlage, Repositorien, mpfs.de) wurden vom Proxy blockiert. Alle Angaben stammen deshalb aus **Suchergebnis-Auszügen und Abstracts**, nicht aus Volltexten. Duolingos eigene Zahlen sind Firmenangaben aus internen A/B-Tests und wurden nicht unabhängig geprüft.

## 1. Kurzfazit

- Duolingo ist groß: **58,7 Mio. tägliche Nutzende** (DAU) im 2. Quartal 2026, +23 % zum Vorjahr; 140,6 Mio. monatlich [Sicher, Aktionärsbrief Q2/2026].
- Der Erfolg beruht weniger auf einem einzelnen Mechanismus als auf **täglicher Gewohnheitsbildung (Streak)** plus **extrem niedriger Einstiegshürde**, **sozialem Vergleich**, einer **Marke mit Humor** und einer **Kultur ständiger A/B-Tests**, die auf Verweildauer und Wiederkehr optimiert [Sicher].
- Die Forschung belegt **kleine bis mittlere positive Effekte** von Gamification auf Lernen und Motivation. Sie hängen aber stark vom Design ab, und Bestenlisten können schwächeren Lernenden schaden [Sicher].
- Für unsere App: **Gewohnheit, Kompetenzerleben und Feedback übernehmen**; **Verlustangst, Monetarisierungsdruck und öffentliche Rangfolgen weglassen**.

## 2. Die Engagement-Mechanik von Duolingo

### Streak (Tage in Folge)
- Duolingo nennt den Streak intern sein wirkungsvollstes Feature; über 600 Experimente in vier Jahren, über 9 Mio. Nutzende mit Streak über einem Jahr [Wahrscheinlich, Podcast-Zusammenfassung mit PM J. Shuttleworth].
- Wer einen 7-Tage-Streak erreicht, beendet den Kurs laut Duolingo **3,6-mal** häufiger. Das ist eine Korrelation und kein Kausalbeleg; Selbstselektion ist wahrscheinlich [Sicher als Firmenangabe].
- Wichtig für uns: **Tagesziel und Streak wurden getrennt**. Eine Lektion verlängert den Streak, das Tagesziel läuft separat. Ergebnis: Retention am Tag 14 relativ +3,3 % [Sicher als Firmenangabe]. Lernende mit dem höchsten Tagesziel hielten am seltensten einen Streak [Wahrscheinlich].
- **Streak Freeze**: Wer bis zu zwei Freezes ausrüsten durfte, war häufiger täglich aktiv (+0,38 % relativ), ohne mehr Pausentage zu machen [Wahrscheinlich, Duolingo-Blog via Snippet]. Freezes gibt es als Belohnung oder gegen Gems.
- Duolingo nennt **Verlustaversion** ausdrücklich als Wirkprinzip [Wahrscheinlich].
- Unabhängige Forschung: Silverman & Barasch (2023, *Journal of Consumer Research*, 7 Studien) zeigen, dass intakte Streaks das Verhalten fortsetzen und ein **gebrochener Streak zum Abbruch führt**. Das Weiterführen der Serie wird zum Selbstzweck. Der Effekt ist stärker, wenn man sich selbst die Schuld gibt, und **schwächer, wenn ein Streak „repariert“ werden kann** [Sicher].

### XP, Tagesziele, Ligen
- Ligen (seit 2018 getestet, heute 10 Stufen) sind wöchentliche Ranglisten mit etwa 30 Personen ähnlicher Aktivität und Zeitzone [Sicher, Duolingo-Blog]. Angeblich +17 % Lernzeit [Schätzung, nur Drittquelle, nicht bestätigt].
- Kritik: XP belohnen **Menge statt Lernen**. Lernende suchen die leichtesten XP-Quellen und wiederholen leichte Lektionen, einige nutzen sogar Hacks. Duolingo hat daraufhin die XP für Pfad-Lektionen erhöht [Wahrscheinlich, Journalismus/Newsletter, keine Studie].

### Herzen bzw. Energie, Gems, Shop
- Herzen bestraften Fehler. Anfänger liefen laut Duolingo **doppelt so oft** mitten in der Lektion aus Herzen. 2025 kam „Energie“ (25 Einheiten, zufällige Rückgabe) [Sicher als Firmenangabe].
- Kritik: Energie geht auch bei fehlerfreiem Lernen aus und wirkt wie eine **Paywall**. Es gab Petitionen und öffentlich abgebrochene Streaks [Wahrscheinlich].
- Ein Lehrkraft-Fazit dazu: Fehler zu bestrafen ist didaktisch kontraproduktiv, gerade beim Sprechen [Schätzung].

### Quests und soziale Funktionen
- Mit Friend Streaks (bis zu 5 Freunde) erledigen Lernende ihre Tageslektion um 22 % häufiger. Wer Freunden folgt, beendet den Kurs 5,6-mal häufiger (Korrelation). Über die Hälfte der DAU folgt mindestens einer Person [Sicher als Firmenangaben]. Friends Quests sind wöchentliche **kooperative** Ziele zu zweit.

### Lernpfad, kurze Lektionen, Feedback
- Der lineare Pfad (seit 2022) ersetzte den Skill-Baum. Duolingo begründet ihn mit **verteilter Wiederholung**, neue und alte Inhalte wechseln sich ab [Sicher als Firmenangabe].
- Lektionen dauern wenige Minuten, jede Antwort bekommt sofort Ton- und Animationsfeedback [Sicher]. Dazu kommen Meilenstein-Animationen und Sonder-Icons nach Streaks [Wahrscheinlich].

### Maskottchen, Figuren, Social Media
- Duo wurde ab 2021 auf TikTok zur „unhinged“, leicht bedrohlichen Eule. Der Account wuchs von etwa 50.000 auf über 2 Mio. Follower in wenigen Monaten, 2025 waren es 16,8 Mio. [Wahrscheinlich, Marketplace/Adweek]. Die Kommentare der Community gelten als „Briefing“ [Wahrscheinlich].
- Die Figurenwelt teilt eine Formsprache. Lily, die gelangweilte Goth-Teenagerin, ist die beliebteste Figur und wurde selbst zum Meme [Wahrscheinlich].
- Ein Befund von Duolingo selbst: Bei der KI-Figur Lily wirkte **zu viel Sarkasmus demotivierend** [Wahrscheinlich].

### Push-Benachrichtigungen und A/B-Tests
- Erinnerungen werden per Bandit-Algorithmus optimiert. Das brachte +0,5 % DAU und +2 % Neunutzer-Retention, getestet mit etwa 200 Mio. Benachrichtigungen (Yancey & Settles, KDD 2020) [Sicher].
- Berühmt ist die passiv-aggressive Schlussmeldung („Diese Erinnerungen scheinen nicht zu wirken …“) [Sicher].
- Es laufen über 100 Experimente gleichzeitig, ungefähr 30 neue pro Woche. Jede Änderung wird getestet [Wahrscheinlich]. Optimiert wird damit auf **Engagement-Kennzahlen**, nicht unbedingt auf Lernerfolg [Schätzung].

## 3. Warum Duolingo gerade Jugendliche anspricht

- **Humor und Memes:** Die Kommunikation ist TikTok-nativ und reagiert schnell auf Trends. Die „bedrohliche Eule“ ist ein Insider-Witz, an dem Jugendliche selbst mitschreiben [Wahrscheinlich].
- **Mobil und reibungsarm:** Man startet ohne Hürde, eine Lektion braucht 2–5 Minuten, Erfolg kommt sofort [Sicher].
- **Sensibilität für Peer-Bewertung:** Jugendliche reagieren neurobiologisch besonders stark auf soziale Bewertung (Somerville 2013). Das erklärt die Zugkraft von Ligen und Friend Streaks und auch deren Risiko [Sicher für den Befund, Schätzung für die Übertragung].
- **Sammeln und Vervollständigen:** Abzeichen, Pfadfortschritt und Streak-Zahl wirken als Identitätsmarker [Wahrscheinlich].
- **Belastbare Altersdaten fehlen:** Den Anteil unter 18 Jahren habe ich nicht gefunden. Laut Duolingo lernen 13–17-Jährige überdurchschnittlich oft Koreanisch und Japanisch. Laut CivicScience sprechen Sprach-Apps Unter-18-Jährige etwas stärker an [Wahrscheinlich]. Zahlen der **JIM-Studie** zu Sprachlern-Apps habe ich nicht gefunden (PDF nicht abrufbar) [offen].

## 4. Was die Forschung sagt

### Positive Effekte
- **Sailer & Homner (2020)**, eine Metaanalyse: kleine signifikante Effekte auf kognitive (g = 0,49), motivationale (g = 0,36) und Verhaltensmaße (g = 0,25). Nur der kognitive Effekt blieb in methodisch strengen Studien stabil. **Spielfiktion (Story)** und **soziale Interaktion** moderieren den Effekt. Am wirksamsten ist **Wettbewerb kombiniert mit Kooperation** [Sicher].
- **Bai, Hew & Huang (2020)**: g = 0,50 über 24 Studien. Lernende schätzen **Feedback und Anerkennung** und lehnen **Angst und Neid** sowie zweckloses Punktesammeln ab [Sicher].
- **Zeng et al. (2024, BJET)**: g = 0,78 über 22 Studien [Sicher]. Eine Metaanalyse von 2026 zum Online-Lernen findet stärkere Effekte bei **K-12** und **narrativer Gamification** als bei Punkten, Abzeichen und Bestenlisten [Wahrscheinlich, Publikationsbias berichtet].
- **Sailer et al. (2017)**: Abzeichen, Bestenlisten und Fortschrittsgrafiken stärken das **Kompetenzerleben**, Avatare, Story und Teams die **soziale Eingebundenheit**. Autonomie wurde nicht gestärkt [Sicher]. Das passt zur Selbstbestimmungstheorie: Spiele ziehen an, weil sie Autonomie, Kompetenz und Eingebundenheit befriedigen (Ryan, Rigby & Przybylski 2006) [Sicher].

### Risiken
- **Bestenlisten:** Bei Hanus & Fox (2015) sanken in einem Kurs mit Bestenliste und Abzeichen über 16 Wochen Motivation, Zufriedenheit und **Prüfungsleistung**, vermittelt über die intrinsische Motivation [Sicher]. Andere Studien sind gemischt, untere Rangplätze gelten als Hauptschadensquelle [Wahrscheinlich].
- **Korrumpierungseffekt:** Laut Deci, Koestner & Ryan (1999, 128 Studien) untergraben erwartete, leistungsabhängige Belohnungen die intrinsische Motivation, **bei Kindern stärker als bei Studierenden**. Positives Feedback dagegen stärkt sie [Sicher, die Debatte mit Cameron & Pierce besteht weiter].
- **Neuheitseffekt:** In einer 14-Wochen-Studie nahm die Wirkung nach etwa 4 Wochen ab und erholte sich ab Woche 6–10 teilweise (Rodrigues et al. 2022) [Wahrscheinlich].
- **Dark Patterns:** Castro & Valença (IHC 2025) finden bei Duolingo neben fairem Design **übermäßige Benachrichtigungen und emotional aufgeladene Visuals**, mit Blick auf Kinderrechte [Sicher]. Für „Streak-Angst“ gibt es Anekdoten, aber **keine kontrollierte Studie** [Wahrscheinlich].
- **Wirksamkeit von Duolingo selbst:** Vesselinov & Grego (2012, von Duolingo finanziert) fanden „ein Semester in 34 Stunden“, aber nur bei Erwachsenen, mit hohem Drop-out und einem Median weit unter dem Mittelwert [Sicher]. Bei Loewen et al. (2019, ReCALL, n = 9) korrelierte die Nutzungszeit moderat mit dem Lernzuwachs, die Motivation schwankte [Sicher]. Die Studien von Jiang et al. (Lese- und Hörverstehen) stammen von Duolingo-Mitarbeitenden. Kritiker bemängeln Selektionsbias [Sicher]. Studien zum **Sprechen bzw. zur Aussprache bei Jugendlichen** habe ich nicht gefunden.

### Schule und Datenschutz
- In Deutschland liegt die Einwilligungsgrenze nach DSGVO Art. 8 bei 16 Jahren [Sicher]. Ohne Konten, Server und Tracking entfällt das meiste Risiko. **Öffentliche Ranglisten mit Klarnamen** würden schulische Leistungsbewertung und Bloßstellung erzeugen und gehören nicht in die App [Schätzung].

## 5. Empfehlungen für Prononciation

Rahmen: kein Server, keine Konten, `localStorage`, Unterricht, 12–16 Jahre, Mikrofon. Die Rangfolge ergibt sich aus erwartetem Nutzen gegenüber Risiko [Schätzung, auf Basis von Abschnitt 4].

| # | Mechanik | Nutzen / Risiko | Ethische Umsetzung |
|---|---|---|---|
| 1 | **Sofortiges, erklärendes Feedback** mit Ton und Animation | hoch / gering | Bei Grün kurz feiern, bei Rot ermutigen und mit dem nächsten Schritt verbinden. Kein Fehlerton, der beschämt. |
| 2 | **Kurze Einheiten** (Missionen à 2–4 Min.) | hoch / gering | Nach jeder Einheit ist ein sauberer Ausstieg möglich, ohne „noch eine“-Druck. |
| 3 | **Sichtbarer Fortschritt** (Laut-Landkarte, Sterne) | hoch / gering | Fortschritt **pro Laut** zeigen („[y] gemeistert“), nicht nur Gesamtpunkte. |
| 4 | **Anstrengung belohnen** | hoch / gering | Sterne oder Abzeichen auch für Wiederholungen und Verbesserung zur letzten Aufnahme („+12 Punkte bei *tu*“), nicht nur für Treffer. Die Selbstbestimmungstheorie spricht für informatives statt kontrollierendes Feedback. |
| 5 | **Verteilte Wiederholung im Pfad** | hoch / gering | Schwache Laute später erneut einstreuen, so wie Duolingo seinen Pfad begründet. |
| 6 | **Maskottchen mit französischer Identität** | mittel–hoch / gering | Eine Figur mit Witz (z. B. ein Hahn oder eine Pariser Taube), die sich auch selbst verspricht. Kein Schuld-Humor, keine Drohungen; Duolingos Lily-Befund zeigt, dass zu viel Sarkasmus demotiviert. |
| 7 | **Story/Spielfiktion** | mittel–hoch / gering | Missionen als Reise durch die Frankophonie. Laut Metaanalysen ist Story ein Moderator, besonders bei K-12. |
| 8 | **Sanfter Streak** | mittel / mittel | Lieber **„Übungstage diese Woche“** (z. B. 3 von 5) statt endloser Tagesserien. Automatische Freezes am Wochenende und in den Ferien, „Reparieren“ durch eine Extramission. Nie mit Verlust drohen; nach einer Pause heißt es „Schön, dass du wieder da bist“. |
| 9 | **Selbstgewählte Tagesziele** | mittel / gering | Ziel und Streak getrennt halten (Duolingo-Befund); niedrige Ziele sind voreingestellt. |
| 10 | **Abzeichen und Sammlung** | mittel / mittel | Abzeichen für Lernmeilensteine (Nasalvokale, Liaison), nicht für reine Nutzungszeit. Erwartete Belohnungen sparsam einsetzen (Korrumpierungseffekt). |
| 11 | **Klassen-Kooperation** | mittel / gering | Ein gemeinsames Klassenziel („Zusammen 200 Wörter grün“), lokal per Lehrkraft-Code oder Beamer, ohne Einzelranking. |
| 12 | **Opt-in-Wettbewerb** | mittel / hoch | Nur auf Wunsch, in Teams, mit Pseudonymen, live im Unterricht (Quiz-Modus), nie dauerhaft gespeichert. Vergleich mit dem eigenen Bestwert ist die Standardeinstellung. |
| 13 | **Persönliche Bestwerte** und Aufnahmearchiv | mittel / gering | „Höre dich vor 4 Wochen“ macht Wachstum hörbar. Alles bleibt lokal. |

### Was wir vermeiden
- **Herzen oder Energie**, also jede Begrenzung des Übens. Beim Sprechen sind Fehler der Lernstoff.
- **Öffentliche oder persistente Ranglisten** mit Namen, insbesondere keine Abstiegszonen.
- **Verlustangst-Botschaften**, Schuld-Benachrichtigungen, die traurige Eule.
- **Push-Benachrichtigungen** generell. Allenfalls eine selbst gestellte Erinnerung, standardmäßig aus.
- **Währung, Shop, Lootboxen und Zufallsbelohnungen** (variable Belohnung als Bindungsmechanik).
- **XP für Menge.** Punkte gibt es für Qualität und Verbesserung, sonst entsteht „XP-Farming“ mit leichten Wörtern.
- **Tracking oder A/B-Tests an Kindern.** Wir evaluieren lieber offen mit Klassen und Feedbackbögen.

### Offene Fragen
- Ob der Neuheitseffekt nach einigen Wochen nachlässt, sollte man im eigenen Unterricht beobachten [Schätzung].
- Zu Gamification beim **Aussprachetraining** mit Spracherkennung bei Jugendlichen habe ich keine Studie gefunden. Eine kleine Aktionsforschung in der eigenen Klasse wäre ein echter Beitrag.

## Quellen

**Duolingo (Firmenangaben)**
- Aktionärsbrief Q2/2026: https://www.sec.gov/Archives/edgar/data/0001562088/000162828026053299/q2fy26duolingo6-30x26share.htm
- Q3/2025 (50 Mio. DAU): https://duolingo.gcs-web.com/news-releases/news-release-details/duolingo-surpasses-50-million-daily-active-users-grows-dau-36
- Streak-Forschung: https://blog.duolingo.com/duolingo-streak-research/
- Streak verbessert (Tagesziel getrennt): https://blog.duolingo.com/improving-the-streak
- Streak und Gewohnheit (Freezes): https://blog.duolingo.com/how-duolingo-streak-builds-habit
- Streaks und Kursabschluss (3,6×): https://making.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals
- Ligen: https://blog.duolingo.com/duolingo-leagues-leaderboards/
- Energie: https://blog.duolingo.com/duolingo-energy/
- Friend Streak: https://blog.duolingo.com/product-lessons-friend-streak/ · Friends Quests: https://blog.duolingo.com/friends-quests/
- Neuer Pfad: https://blog.duolingo.com/new-duolingo-home-screen-design
- Figuren: https://blog.duolingo.com/building-character/
- Altersgruppen: https://blog.duolingo.com/dear-duolingo-how-does-language-learning-differ-between-generations
- Yancey & Settles (2020), KDD: https://research.duolingo.com/papers/yancey.kdd20.pdf
- Podcast Shuttleworth: https://lennysnewsletter.com/p/behind-the-product-duolingo-streaks
- Experimentierkultur: https://increment.com/testing/launching-duolingos-arabic-language-course/ · https://firstmark.com/story/how-duolingo-runs-experiments-at-scale/

**Forschung**
- Sailer & Homner (2020), *Educ. Psychol. Rev.* 32: https://link.springer.com/article/10.1007/s10648-019-09498-w
- Sailer et al. (2017), *Computers in Human Behavior* 69: https://opus.bibliothek.uni-augsburg.de/opus4/files/109059/109059.pdf
- Bai, Hew & Huang (2020), Metaanalyse: https://www.gbl.uzh.ch/quartz/references/Bai-et-al.-(2020)
- Zeng et al. (2024), *BJET*, DOI 10.1111/bjet.13471: https://www.citedrive.com/en/discovery/exploring-the-impact-of-gamification-on-students-academic-performance-a-comprehensive-metaanalysis-of-studies-from-the-year-2008-to-2023/
- Li, Ma & Shi (2023), *Frontiers in Psychology*: https://www.frontiersin.org/articles/10.3389/fpsyg.2023.1253549/full
- Metaanalyse 2026 (Online-Lernen, K-12): https://olj.onlinelearningconsortium.org/index.php/olj/article/view/5188
- Hanus & Fox (2015), *Computers & Education* 80: https://www.smhp.psych.ucla.edu/pdfdocs/gamil.pdf
- Na & Han (2023), Bestenlisten: https://www.emerald.com/insight/content/doi/10.1108/intr-12-2021-0897/full/html
- Rodrigues et al. (2022), Neuheitseffekt: https://www.universityxp.com/research/2022/10/3/gamification-suffers-from-the-novelty-effect-but-benefits-from-the-familiarization-effect-findings-from-a-longitudinal-study
- Deci, Koestner & Ryan (1999), *Psychol. Bulletin*: https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf
- Ryan, Rigby & Przybylski (2006), *Motivation and Emotion*: https://www.rochester.edu/warner/lida/wp-content/uploads/2022/11/02bfe513dd59366750000000.pdf
- Silverman & Barasch (2023), *J. Consumer Research* 49(6): https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb
- Somerville (2013), *Current Directions in Psychological Science* 22(2): https://journals.sagepub.com/doi/10.1177/0963721413476512
- Castro & Valença (2025), IHC: https://sol.sbc.org.br/index.php/ihc/article/view/37677
- Loewen et al. (2019), *ReCALL* 31(3): https://www.cambridge.org/core/journals/recall/article/abs/mobileassisted-language-learning-a-duolingo-case-study/A4D7C8F71782A37D258C19F357DDBCBE
- Vesselinov & Grego (2012), Bericht: https://techcrunch.com/2013/01/17/study-learning-spanish-with-duolingo-can-be-more-effective-than-college-classes-or-rosetta-stone/amp
- Jiang et al., Studie zur Anfängerstufe: https://experts.nau.edu/en/publications/evaluating-the-reading-and-listening-outcomes-of-beginning-level-/ · Kritik: https://callej.org/index.php/journal/article/download/419/347/1013

**Journalismus und Sonstiges**
- TikTok/Duo: https://www.marketplace.org/story/2022/01/17/the-creative-force-behind-a-viral-corporate-tiktok-account · https://www.adweek.com/brand-marketing/duolingo-duo-owl-marketing-strategy/
- Lily: https://www.mediapost.com/publications/article/391235
- XP-Kritik und Cheating: https://newsletter.duoplanet.com/posts/duolingo-league-easier · https://kotaku.com/duolingo-app-cheats-hacks-leagues-xp-why-duohacker-1850506482
- Kritik an Energie: https://androidauthority.com/quitting-duolingo-energy-system-3599842
- Sprach-Apps und Alter: https://civicscience.com/?p=18918

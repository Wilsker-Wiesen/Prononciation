# Prononciation als App: iPhone, iPad, Android und Browser

## Standardweg (wie Parteigesicht und Qui est-ce)

**Adresse:** https://wilsker-wiesen.github.io/Prononciation/

GitHub Pages veröffentlicht die App bei jedem Push automatisch. Auf iPhone/iPad in Safari
„Teilen → Zum Home-Bildschirm“ wählen (die App zeigt dazu einen Hinweis); danach startet sie mit
eigenem Symbol im Vollbild und funktioniert offline. Auf Android, Chromebook und Windows bietet der
Browser „App installieren“ an. Kein Konto, kein App Store, keine Kosten.

## Optionen ohne Apple-Entwicklerkonto

| Option | Geht für Schülergeräte? | Bemerkung |
| --- | --- | --- |
| Web-App über „Zum Home-Bildschirm“ | ja, alle Geräte | Standardweg, oben |
| Android-App (APK aus dem Release `app-latest`) | ja, Android | Installation „aus unbekannter Quelle“ nötig |
| Xcode mit kostenloser Apple-ID auf dem eigenen iPhone/iPad | nein | nur eigene Geräte, App läuft nach 7 Tagen ab und muss neu aufgespielt werden |
| App Store, TestFlight, Verteilung über Schul-MDM | – | braucht ein Apple-Entwicklerkonto (Abschnitt weiter unten) |

Die native Hülle (`ios/`, `android/`) bleibt im Repository und wird bei jedem Push mitgebaut. Wird später
doch ein Apple-Konto eingerichtet, ist kein Umbau nötig.

## Was eine native App zusätzlich brächte

- echtes App-Symbol und Startbildschirm, Installation über App Store, TestFlight oder Schul-MDM
- Ausspracheerkennung ist **im App-Paket enthalten** (kein Download von 122 MB beim ersten Start)
- Speicher sicher vor automatischem Löschen (für die Web-App gilt das nur, wenn sie über
  „Zum Home-Bildschirm“ abgelegt ist; im normalen Safari-Tab kann iOS Daten nach Wochen ohne Nutzung löschen)

Technik: [Capacitor 8](https://capacitorjs.com) packt die Web-App in eine native Hülle
(`ios/`, `android/`). Mikrofonfreigabe: iOS fragt einmal mit dem Text aus `Info.plist`,
Android mit der Systemabfrage für `RECORD_AUDIO`.

## Bauen

Automatisch: Der Workflow **Native Apps** (`.github/workflows/native.yml`) baut bei jedem Push

- iOS für den Simulator (Prüfung, dass das Xcode-Projekt fehlerfrei baut),
- eine Android-APK, abgelegt im Release `app-latest`.

Lokal auf einem Mac mit Xcode:

```bash
npm ci
npm run native:ios        # lädt das Modell, baut die Web-App, öffnet Xcode
npm run native:android    # dasselbe für Android Studio
```

## iPhone/iPad: TestFlight und App Store

1. **Apple-Entwicklerkonto** anlegen (Apple Developer Program, 99 € pro Jahr). Für Schulen und
   Schulträger gibt es eine Gebührenbefreiung für Bildungseinrichtungen; beantragt wird sie von der
   Einrichtung, die dann auch als Anbieter im App Store erscheint. Bei einem Einzelkonto steht der
   eigene Name als Anbieter im App Store.
2. In **App Store Connect** eine App mit der Bundle-ID `de.wilskerwiesen.prononciation` anlegen.
3. Unter *Benutzer und Zugriff → Integrationen* einen **API-Schlüssel** (Rolle *Admin*, nötig für
   automatisches Signieren) erzeugen und im GitHub-Repository unter
   *Settings → Secrets and variables → Actions* hinterlegen:
   `APPLE_TEAM_ID`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` (Inhalt der .p8-Datei).
4. Actions → **Native Apps** → *Run workflow* mit `testflight = true`. Der Build erscheint nach
   einigen Minuten in TestFlight.
5. **TestFlight**: interne Tester (bis 100 Personen des Teams) sofort; externe Tester bis 10 000 per
   öffentlichem Link nach einer kurzen Beta-Prüfung durch Apple. Ein Build läuft 90 Tage.
6. **App Store** (optional, dauerhaft): Kategorie *Bildung*, Datenschutzangaben „Keine Daten
   erfasst“, Altersfreigabe 4+. Schulen mit Apple School Manager können die App dann über ihr
   MDM (z. B. Jamf, Relution) auf Schul-iPads verteilen.

## Android

- Die APK aus dem Release `app-latest` lässt sich direkt installieren (Einstellung „Unbekannte
  Apps installieren“ nötig). Für Schülergeräte ist der Weg über Google Play einfacher; dafür braucht
  es ein Play-Konto und eine Release-Signatur (Erweiterung des Workflows, sobald gewünscht).

## Rechtliches

Die native App enthält nur eigene Inhalte, die Ausspracheerkennung (Apache 2.0) und die
Vorbildstimme (siehe `public/tts/manifest.json`, Quellenangabe in der App unter Info).
Verlagsmaterial wird wie bisher nur über Pakete auf das Gerät geladen und ist nie Teil der App.

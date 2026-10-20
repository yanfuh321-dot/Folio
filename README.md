# Folio · Privates PDF Studio

Eine lokale PDF-Web-App mit deutscher Oberfläche. Version 2.1, 20. Oktober 2026.
PDF-Werkzeuge arbeiten lokal. Optional übersetzt OpenRouter ausgewählten Text mit deinem eigenen API-Key. Keine Analyse-Tracker und keine automatische Cloud-Nutzung.
Die App ist eine umfangreiche erste Version, kein vollständiger Acrobat-/Foxit-Ersatz.

## Schnell starten unter Windows

1. Das gesamte ZIP entpacken.
2. `Start-Folio-Windows.bat` starten. Voraussetzung: installiertes Python 3.
3. Im Browser öffnet sich `http://127.0.0.1:8765/`.
4. Eine PDF in der App auswählen. Sie wird **nicht** an den lokalen Webserver gesendet.

Der lokale Server liefert nur Programmdateien aus, bindet ausschließlich an 127.0.0.1,
hat keine PDF-Verarbeitungs-API und akzeptiert keine Uploads.
Der Doppelklick auf `dist/index.html` funktioniert wegen Browserregeln für WebAssembly/Worker nicht.
Für macOS/Linux: `python3 scripts/local-server.py` im entpackten Ordner.

## GitHub Pages

Der Ordner ist ein vollständiges Repository mit fertig gebündelten Dateien; kein Build ist nötig.

1. Neues Repository bei GitHub anlegen und den entpackten Inhalt hochladen bzw. per Git pushen.
   `dist`, `.github/workflows/pages.yml`, README, Lizenz und Quellcode gehören dazu.
   **Keine echten PDFs, Lieferantendaten oder Passwörter ins Repository aufnehmen.**
2. Unter **Settings → Pages → Build and deployment → Source** `GitHub Actions` auswählen.
3. Der Workflow `Publish Folio to GitHub Pages` veröffentlicht den Ordner `dist`.
   Falls der Upload schon vorher erfolgt ist, den Workflow unter Actions manuell starten.
4. Die Pages-Adresse öffnen. Relative Pfade unterstützen Repository-Unterverzeichnisse.

Die GitHub-Seite kann je nach Kontoeinstellung öffentlich erreichbar sein. Das betrifft die App,
nicht lokal ausgewählte PDFs. GitHub empfängt beim Abruf normale Verbindungsdaten.
Alternativ lässt sich `dist` auf jedem statischen HTTPS-Webserver bereitstellen.

## Funktionsumfang

| Bereich | Enthalten |
|---|---|
| Lesen | Seitenvorschau, Miniaturen, Zoom, Textsuche, passwortgeschützte PDFs öffnen |
| Text | Absatzfelder bearbeiten, vergrößern, verschieben und erneut bearbeiten; automatische Zeilenumbrüche im Rahmen; einzelne Zeilen ersetzen; Latin-/CJK-Ausgabe |
| Anmerkungen | Markieren, Unterstreichen, Durchstreichen, Freihand, Rechteck, Ellipse, Pfeil, Notiz; Entfernen |
| Bilder | PNG/JPEG einsetzen, Bilder als PDF-Seiten hinzufügen, Unterschrift zeichnen und als Bild einsetzen |
| Seiten | Drehen, duplizieren, neu sortieren, löschen, leere Seite, zuschneiden, PDFs anhängen, Bereiche exportieren, Einzelseiten-ZIP |
| Formulare | Vorhandene Text-/Auswahlfelder, Checkboxen, Radiobuttons; festes Einbetten im Export |
| Textauszug | Eingebetteten Text auslesen; OCR für Deutsch, Englisch, vereinfachtes Chinesisch und gemischte Sprachpaare |
| Übersetzung | OpenRouter mit eigenem API-Key und freier Modellwahl oder lokale Browser-Translator-API; Textvergleich und korrigierbare Ausgabe |
| Export | DOCX mit positionierten Textfeldern oder Bildseiten; XLSX mit Zellen oder Bildseiten; PDF, TXT, Text-PDF, PNG/JPEG, Bilder-ZIP, Metadaten, Wasserzeichen, Seitennummern |
| Zertifikat | Lokale RSA-Signatur mit P12/PFX; SHA-256/CMS; signierte Kopie herunterladen |
| Schutz | Echte Inhaltsentfernung im gewählten Rechteck; bereinigtes Bild-PDF; AES-256-Öffnungspasswort |
| Nutzung | Rückgängig/Wiederholen in dieser Sitzung, Dunkelmodus, responsive Oberfläche, optionaler Offlinecache |

## KI-Übersetzung mit OpenRouter

1. Unter `Text & Übersetzung` Text auslesen oder OCR starten.
2. Dienst `OpenRouter` wählen und `OpenRouter einrichten` öffnen.
3. Eigenen API-Key eingeben. Über `Modelle und Preise laden` eine aktuelle Modell-ID wählen
   oder die ID manuell eingeben. Der Key bleibt nur im Arbeitsspeicher dieses Tabs.
4. Ausgangs- und Zielsprache wählen und `Mit KI übersetzen` anklicken.
5. Im Dialog den zu sendenden Text prüfen oder kürzen und `Text senden & übersetzen` wählen.
6. Übersetzung vergleichen, korrigieren und als TXT oder neu gesetzte Text-PDF exportieren.

Bei der reinen Textübersetzung geht nur der bestätigte Text direkt an OpenRouter und den Modellanbieter.
Der zusätzliche Layout-Modus überträgt ausgewählte sichtbare PDF-Seiten einschließlich Bildern. Der Key wird ausschließlich an OpenRouter gesendet, nie in URL,
LocalStorage, Service-Worker-Cache oder Repository geschrieben. Löschen unter `OpenRouter einrichten`.
OpenRouter kann Kosten berechnen; einen eigenen Key mit Ausgabenlimit verwenden.

Folio verlangt `provider.data_collection: deny`; zusätzlich ist ZDR standardmäßig eingeschaltet.
Dies schränkt die verfügbaren Anbieter ein und kann zu einem Fehler führen. Es ersetzt nicht die
Prüfung der OpenRouter-Kontoeinstellungen und Dienstbedingungen. Kein automatischer Wechsel
zur lokalen Übersetzung oder zu einem anderen Dienst. Modellliste und Übersetzungen werden
nur durch die entsprechenden Buttons angefragt. Abbrechen stoppt weitere Abschnitte;
bereits versandte Anfragen können trotzdem berechnet werden. Fehler/Token-Abbruch werden angezeigt,
Teilübersetzungen als unvollständig markiert und unter einem entsprechenden Dateinamen exportiert.

Alternativ `Browser · lokal`: nutzt die native Translator-API, falls vorhanden. Beim ersten Gebrauch
kann der Browser Sprachmodelle herunterladen. Ohne Unterstützung bleibt diese Option gesperrt.
Text bleibt bei lokaler Übersetzung auf dem Gerät. OpenRouter braucht immer Internet.

Die reine Textübersetzung erzeugt neu gesetzte Textdokumente. Für ähnliche Seitenlayouts steht der folgende PDF-Modus zur Verfügung.
Bei zweisprachiger Ausgabe steht der vollständige Ausgangstext vor der Übersetzung.

## PDF mit Layout übersetzen (Zertifikate)

Unter `Text & Übersetzung → PDF mit Layout übersetzen`:

1. OpenRouter-Key und ein Modell mit **nativer PDF-Eingabe und strukturierter Ausgabe** auswählen.
   Die Modellliste wird bei Einrichtung für diesen Modus nach PDF-Unterstützung gefiltert.
2. Seitenbereich, Ausgangs- und Zielsprache wählen (voreingestellt Chinesisch → Englisch).
3. Mit `PDF senden & übersetzen` die Übertragung starten. Bis zu 20 Seiten pro Vorgang,
   eine Modellanfrage pro Seite. PDF-Seiten werden als sichtbare Bild-PDF mit 144 dpi neu erstellt;
   keine versteckten Ebenen, Metadaten, Anhänge, Formularaktionen oder Zertifikatsschlüssel.
4. Native PDF-Textpositionen oder bei Scans lokale OCR dienen als Positionshilfe. Das KI-Modell
   liest die PDF und liefert Übersetzungen und Textfelder. Die App setzt die Ausgabe lokal zusammen.
5. Original und Übersetzung nebeneinander prüfen. Textfelder anklicken, Text/Farbe/Schriftgröße,
   Position, Größe und überdeckten Originalbereich korrigieren. Manuelle Textfelder können ergänzt
   werden. `Original behalten` erhält Logos, Stempel, Unterschriften oder bereits englische Texte.
6. Vorschau aktualisieren und PDF herunterladen. Änderungen in der Vorschau sind lokal und
   erzeugen keine weiteren API-Anfragen. Entwürfe bleiben nur in diesem Tab.

Originalseitenbild mit Rahmen, Grafiken und Stempeln bleibt als Hintergrund erhalten. Textbereiche
werden mit einer aus der Umgebung ermittelten oder gewählten Vollfarbe überdeckt und übersetzt.
Keine pixelgenaue Rekonstruktion gemusterter Hintergründe; KI-Positionen und OCR können falsch sein.
Überlappungen und kleine Schrift werden gemeldet. Überlaufende Felder verhindern den Export, bis
sie angepasst oder bewusst im Original belassen werden. Nicht zugeordnete Bereiche werden gemeldet.
Abbrüche erhalten fertige Seiten als klar gekennzeichnete Teilübersetzung; fehlende Seiten fehlen
auch im Teilexport. Erneutes Starten erzeugt einen neuen Entwurf und neue Anfragen.

Die Ausgabe trägt außerhalb des ursprünglichen Seitenbildes einen Hinweis `AI TRANSLATION` und
`Not the original certificate`. Sie ersetzt weder das Original noch eine beglaubigte Übersetzung;
vorhandene digitale Signaturen werden nicht übernommen. Zertifikatsnummern, Namen, Gültigkeit,
Normen und Tabellen insbesondere mit dem Original vergleichen. Der Originalinhalt bleibt als
Bild unter den Überdeckungen enthalten: Diese Funktion ist **keine Schwärzungsfunktion**.

OpenRouter wird auf `file-parser: native` festgelegt; es gibt keinen automatischen Wechsel zu
Mistral OCR/anderen PDF-Parsern. Nicht unterstützte Modelle oder ZDR-Endpunkte werden abgelehnt.
API-Kosten und die Verfügbarkeit der ausgewählten Kombination hängen vom Anbieter ab.

## Absätze bearbeiten

Unter `Bearbeiten → Absätze` einen erkannten horizontalen Absatz oder ein eingefügtes Textfeld
anklicken. Text, Position, Breite, Höhe, Schrift, Größe, Farbe und Ausrichtung lassen sich ändern.
Der Text wird innerhalb des Rahmens neu umbrochen. `Neues Absatzfeld` legt einen neuen Bereich an.
Originaltext im alten Bereich wird entfernt; Bilder und Vektorgrafiken bleiben erhalten.
Passt der neue Text nicht, wird die Änderung atomar verworfen. Optional Schrift verkleinern.
Benachbarte Absätze verschieben sich nicht automatisch; es gibt keinen seitenübergreifenden Textfluss.
Scans, vertikaler/gedrehter Text und identische Rekonstruktion eingebetteter Originalschriften sind ausgenommen.

## Word und Excel

Unter `Export & Schutz` stehen DOCX und XLSX zur Verfügung:

- **Word · bearbeitbar:** positionierte Textfelder für horizontale PDF-Textzeilen,
  mit Schriftgröße/-farbe und einem Rasterhintergrund der verbleibenden Grafiken.
  Nicht vorhandene Schriften werden vom Office-Programm ersetzt. Komplexe Layouts können abweichen.
- **Excel · bearbeitbar:** Zellen aus Textpositionen. Tabellenbereich kann direkt auf der PDF
  gewählt werden; Spaltengrenzen sind in PDF-Punkten manuell korrigierbar. Die Vorschau zeigt
  die ersten 25 Zeilen der ersten gewählten Seite; exportiert werden alle Zeilen/gewählten Seiten.
  Standardmäßig Textzellen für Identifikatoren und führende Nullen. Optional einfache deutsche
  Dezimalzahlen als numerische Werte. Es werden keine Formeln erzeugt oder ausgeführt.
- **Originalansicht:** jede PDF-Seite wird als Bild in Word bzw. Excel eingebettet.
  Das sichtbare Seitenbild bleibt erhalten, Inhalte sind nicht einzeln editierbar.

Scans ergeben ohne weitere Verarbeitung keine editierbaren Office-Texte oder Tabellen.
Keine Garantie perfekter bearbeitbarer Layouttreue, kein Word-/Excel-Import nach PDF.
Word unterstützt in diesem Export Seiten bis 55,8 cm Kantenlänge. Export im Zielprogramm prüfen.

## Zertifikatssignatur

`Export & Schutz → Mit P12 / PFX signieren` akzeptiert ein PKCS#12-Zertifikat mit genau einem
verschlüsselten RSA-Privatschlüssel. Nach Passworteingabe werden Inhaber, Aussteller, Gültigkeit
und SHA-256-Fingerabdruck angezeigt. Die fertige Kopie wird mit einer unsichtbaren
`adbe.pkcs7.detached`-Signatur (CMS/SHA-256) heruntergeladen; sie erscheint im Signaturbereich
geeigneter PDF-Reader. Eine gezeichnete Unterschrift kann vorher separat eingefügt werden.

Zertifikat und Passwort bleiben in einem kurzlebigen lokalen Worker, der anschließend beendet wird.
Gültigkeitszeitraum und Key-Usage werden geprüft, **nicht** Zertifikatskette, Widerruf oder Vertrauen.
Keine qualifizierte Signatur, Smartcard, EC-Schlüssel, Mehrfachsignatur, TSA oder PAdES-LT/LTA.
Bereits signierte Eingaben werden für diese Funktion abgelehnt. Formulare/Anmerkungen werden
vor dem Signieren eingebettet; nach Schwärzungen wird eine bereinigte Bild-PDF signiert.
Die signierte Kopie hat kein Öffnungspasswort. Spätere Änderungen können die Signatur ungültig machen.

## Datenschutz und Offlinebetrieb

- PDF-Werkzeuge, Bilder, Zertifikate, Passwörter, OCR und Office-Export bleiben im Browser.
- Ausschließlich die bewusst gestartete OpenRouter-Übersetzung sendet bestätigten Text oder ausgewählte PDF-Seiten in die Cloud.
- PDF-Upload nur im expliziten Layout-Übersetzungsmodus; keine eigene Backend-Verarbeitung, keine Tracker, keine Webfonts oder Laufzeit-CDNs.
- Programmdateien und OCR-Sprachdaten kommen vom selben Host wie die App.
- Ein expliziter Netzwerkfilter in Hauptfenster und Workern erlaubt nur GET-Anfragen auf
  bekannte Programmdateien ohne Query-Parameter. Ausschließlich im Hauptfenster sind zusätzlich
  GET auf https://openrouter.ai/api/v1/models und POST auf https://openrouter.ai/api/v1/chat/completions
  erlaubt. Keine Cookies/Redirects bei API-Aufrufen. PDF-/OCR-/Signatur-Worker dürfen keine Cloud-Anfragen senden.
  Andere externe Ziele, XHR-Uploads, WebSockets und Beacons sind gesperrt. CSP begrenzt Ressourcen zusätzlich.
- Browserinterne Übersetzungsmodell-Downloads werden vom Browser verwaltet.
- `Offline vorbereiten` speichert ausschließlich die App-Dateien und OCR-Modelle (ca. 38 MB).
  Das lädt noch keine Übersetzungsmodelle. Gewünschte Sprachpaare einmal online starten.
- PDF-Arbeitskopien, Texte, API-Keys, Zertifikatspasswörter und Undo-Zustände werden nicht in LocalStorage, IndexedDB oder
  den Service-Worker-Cache geschrieben. LocalStorage enthält nur die Darstellungseinstellung.
- Beim Tab-Schließen gehen unexportierte Änderungen verloren. Browser/OS können RAM auslagern;
  sichere physische Speicherlöschung wird nicht versprochen.
- Maximale Kontrolle: lokal starten, benötigte Sprachmodelle vorbereiten, danach offline arbeiten.
  Die App ersetzt keine Gerätesicherheit und kontrolliert keine Browser-Erweiterungen.
- Bei gehosteter Nutzung sieht der Host normale Abrufdaten, z. B. IP-Adresse und Abrufzeit.

## Wichtige Grenzen

- **Textkorrektur:** Rahmenbasierte Absatzbearbeitung, kein automatischer Gesamtseiten-Reflow.
- **Schwärzen:** Der gewählte Bereich wird mit MuPDF tatsächlich entfernt. Als zusätzlicher
  Schutz ist anschließend Bild-PDF vorausgewählt. Diese enthält ausschließlich gerenderte sichtbare
  Seiten, keine alten Textschichten, Anhänge oder Formulare. Versteckte/duplizierte Inhalte außerhalb
  der Auswahl werden nicht automatisch identifiziert. Export immer visuell kontrollieren.
- **Zuschneiden:** ändert nur den sichtbaren Ausschnitt. Es entfernt den Inhalt außerhalb nicht.
- **Bildkomprimierung:** erzeugt JPEG-Bildseiten, verliert durchsuchbaren Text und Interaktivität.
  Die Dateigröße kann größer werden. Vektor-PDF-Export komprimiert Streams verlustfrei.
- **Unterschriften:** Gezeichnetes Bild oder separate lokale RSA-Zertifikatssignatur; siehe oben.
  Vorhandene digitale Signaturen bleiben durch Bearbeitung und Neu-Export nicht erhalten.
- **Passwörter:** werden nur für den Export genutzt und nicht gespeichert. Ohne Exportpasswort
  wird auch eine zuvor geschützte Quelle als unverschlüsselte Kopie ausgegeben.
  Keine Kommas/Steuerzeichen, maximal 100 UTF-8-Bytes.
- **Zusammenführen:** die angehängten Kopien werden vorher visuell eingebettet; ihre interaktiven
  Felder und Anmerkungen sind danach statisch. Links/Bookmarks werden nicht umfassend migriert.
- **OCR:** Textauszug, kein suchbarer Textlayer über den Originalseiten.
- **Nicht enthalten:** garantierte bearbeitbare Office-Layouttreue und Office-Import nach PDF, Formularentwurf/XFA, PDF/A-/PDF/UA-Prüfung,
  vollständiges PDF-Tagging, Vektorobjekt-Editor, qualifizierte Signaturen, vertrauenswürdige Zeitstempel, Cloud-Zusammenarbeit.
- Große PDFs können viel RAM benötigen. Dateigrenze: 150 MB; Rendergrenze: 12 Megapixel pro Seite.

## Entwicklung und Prüfung

Die Dateien in `dist` sind der unminifizierte App-Quellcode. Abhängigkeiten sind mit Versionen
gebündelt. `pnpm-lock.yaml` fixiert die verwendeten Pakete.

```
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm test
```

`scripts/vendor.mjs` kopiert Laufzeitabhängigkeiten. `scripts/build-signing.mjs` bündelt die lokale Signatur-Engine aus `src/` mit Lizenzhinweisen. `scripts/package.mjs` erzeugt
die erlaubte Assetliste, den Offlinecache und das kleine Quellcode-ZIP. Nach Änderungen ausführen.

Prüfung dieser Ausgabe: echte PDF-Roundtrips, Formulardaten, Textersetzung und Schriften,
Schwärzung, Bild-PDF, Verschlüsselung, Seitenoperationen, Unicode-Textausgabe, Netzwerkfilter
und Assetreferenzen automatisiert geprüft. Beispiel-PDF visuell geprüft.
Die Signatur wurde unabhängig per OpenSSL geprüft, manipulierte Daten werden abgelehnt.
Office-Dateien wurden strukturell mit python-docx/openpyxl geprüft. OpenRouter-Anfragen und
Fehlerabläufe wurden mit simulierten API-Antworten geprüft; kein Live-Key wurde verwendet.
Kein vollständiger interaktiver Browsertest in der Erstellungsumgebung; lokale Translator-API
und tatsächlicher Browser-OCR-Start bleiben am Zielgerät zu prüfen. Node-OCR prüft separat
die gebündelten Sprachmodelle. Siehe `VERIFICATION.md` für den konkreten Prüfstand.

## Lizenz und Quellen

Folio: GNU AGPL-3.0-only. Vollständiger App-Quellcode ist enthalten und in der App über
`Privatsphäre → Quellcode herunterladen` zugänglich. Verwendete Bibliotheken behalten ihre Lizenzen.
MuPDF steht unter AGPL bzw. einer separat zu erwerbenden kommerziellen Lizenz.
Beim Weiterverteilen die Lizenz- und Quellcodehinweise erhalten. 

- MuPDF 1.28.1: https://www.npmjs.com/package/mupdf/v/1.28.1
- MuPDF korrespondierender C-/WASM-Quellcode und Buildanleitung:
  https://github.com/ArtifexSoftware/mupdf/tree/1.28.1/platform/wasm
- Tesseract.js 7.0.0: https://github.com/naptha/tesseract.js/tree/v7.0.0
- Tesseract.js-core 7.0.0: https://github.com/naptha/tesseract.js-core/tree/v7.0.0
- OCR-Sprachpakete 1.0.0: https://github.com/naptha/tessdata
- fflate 0.8.2: https://github.com/101arrowz/fflate/tree/v0.8.2
- Browserübersetzung: https://developer.chrome.com/docs/ai/translator-api

Die Runtimebibliotheken und das aus eigenen Quellen gebündelte Signaturmodul liegen unter `dist/vendor`; Lizenztexte unter `dist/licenses`.
`dist/THIRD_PARTY.html` verlinkt zu vollständigen Quellen und Buildanleitungen der unveränderten
Open-Source-Komponenten. Es werden keine persönlichen Dateien mit dem Quellcode ausgeliefert.

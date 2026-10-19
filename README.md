# Folio · Privates PDF Studio

Eine lokale PDF-Web-App mit deutscher Oberfläche. Version 1.0, 19. Oktober 2026.
Keine Konten innerhalb der App, keine Analyse-Tracker, keine Datei-Uploads und kein Cloud-KI-Fallback.
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
| Text | Neue Textfelder; einzelne vorhandene horizontale Textzeilen entfernen und ersetzen; Latin-/CJK-Ausgabe |
| Anmerkungen | Markieren, Unterstreichen, Durchstreichen, Freihand, Rechteck, Ellipse, Pfeil, Notiz; Entfernen |
| Bilder | PNG/JPEG einsetzen, Bilder als PDF-Seiten hinzufügen, Unterschrift zeichnen und als Bild einsetzen |
| Seiten | Drehen, duplizieren, neu sortieren, löschen, leere Seite, zuschneiden, PDFs anhängen, Bereiche exportieren, Einzelseiten-ZIP |
| Formulare | Vorhandene Text-/Auswahlfelder, Checkboxen, Radiobuttons; festes Einbetten im Export |
| Textauszug | Eingebetteten Text auslesen; OCR für Deutsch, Englisch, vereinfachtes Chinesisch und gemischte Sprachpaare |
| Übersetzung | Lokale Browser-Translator-API, Deutsch/Englisch/Chinesisch, Textvergleich, korrigierbare Ausgabe |
| Export | PDF, TXT, Text-PDF, PNG/JPEG, Bilder-ZIP, Metadaten, Wasserzeichen, Seitennummern |
| Schutz | Echte Inhaltsentfernung im gewählten Rechteck; bereinigtes Bild-PDF; AES-256-Öffnungspasswort |
| Nutzung | Rückgängig/Wiederholen in dieser Sitzung, Dunkelmodus, responsive Oberfläche, optionaler Offlinecache |

## Übersetzung

Empfohlen: aktueller Chrome auf einem Computer. Die App prüft `Translator` zur Laufzeit.
Beim ersten Gebrauch kann der Browser Sprachmodelle herunterladen; Dokumenttext wird danach
auf dem Gerät verarbeitet. Browser, Region, Richtlinien und Modellverfügbarkeit können die
Funktion einschränken. Ist sie nicht verfügbar, bleibt die Funktion gesperrt. Es gibt keinen
automatischen Wechsel zu einem externen Dienst. Auf Smartphones kann sie fehlen.

1. `Text & Übersetzung` öffnen, Seitenbereich wählen.
2. `PDF-Text auslesen` oder bei Scans `Scans erkennen (OCR)`.
3. Ausgangs- und Zielsprache auswählen, `Übersetzung starten`.
4. Unter `Text & Übersetzung prüfen` beide Fassungen kontrollieren.
5. Übersetzten Text als TXT oder **neu gesetzte Text-PDF** speichern.

Die ursprüngliche Seitenaufteilung und Tabellen werden dabei nicht layoutgetreu übersetzt.
Bei der zweisprachigen Ausgabe steht der vollständige Ausgangstext vor der Übersetzung.

## Datenschutz und Offlinebetrieb

- PDFs, Bilder, Passwörter, OCR-Ergebnisse und Übersetzungen verarbeitet die App im Browser.
- Kein Datei-Upload, keine Backend-Verarbeitung, keine Tracker, keine Webfonts oder Laufzeit-CDNs.
- Programmdateien und OCR-Sprachdaten kommen vom selben Host wie die App.
- Ein expliziter Netzwerkfilter in Hauptfenster und Workern erlaubt nur GET-Anfragen auf
  bekannte Programmdateien ohne Query-Parameter. POST, externe Ziele, XHR-Uploads,
  WebSockets und Beacon-Übertragungen sind gesperrt. Eine CSP begrenzt externe Ressourcen zusätzlich.
- Browserinterne Übersetzungsmodell-Downloads werden vom Browser verwaltet.
- `Offline vorbereiten` speichert ausschließlich die App-Dateien und OCR-Modelle (ca. 38 MB).
  Das lädt noch keine Übersetzungsmodelle. Gewünschte Sprachpaare einmal online starten.
- PDF-Arbeitskopien, Texte und Undo-Zustände werden nicht in LocalStorage, IndexedDB oder
  den Service-Worker-Cache geschrieben. LocalStorage enthält nur die Darstellungseinstellung.
- Beim Tab-Schließen gehen unexportierte Änderungen verloren. Browser/OS können RAM auslagern;
  sichere physische Speicherlöschung wird nicht versprochen.
- Maximale Kontrolle: lokal starten, benötigte Sprachmodelle vorbereiten, danach offline arbeiten.
  Die App ersetzt keine Gerätesicherheit und kontrolliert keine Browser-Erweiterungen.
- Bei gehosteter Nutzung sieht der Host normale Abrufdaten, z. B. IP-Adresse und Abrufzeit.

## Wichtige Grenzen

- **Textkorrektur:** einzelne horizontale Textzeilen, mit neuer Standard-/CJK-Schrift und
  Größenanpassung im gewählten Rahmen. Kein freies Absatz-Reflow, keine garantiert identische Schrift.
  Scans müssen zunächst per OCR ausgelesen werden; OCR ersetzt nicht automatisch den Scantext.
- **Schwärzen:** Der gewählte Bereich wird mit MuPDF tatsächlich entfernt. Als zusätzlicher
  Schutz ist anschließend Bild-PDF vorausgewählt. Diese enthält ausschließlich gerenderte sichtbare
  Seiten, keine alten Textschichten, Anhänge oder Formulare. Versteckte/duplizierte Inhalte außerhalb
  der Auswahl werden nicht automatisch identifiziert. Export immer visuell kontrollieren.
- **Zuschneiden:** ändert nur den sichtbaren Ausschnitt. Es entfernt den Inhalt außerhalb nicht.
- **Bildkomprimierung:** erzeugt JPEG-Bildseiten, verliert durchsuchbaren Text und Interaktivität.
  Die Dateigröße kann größer werden. Vektor-PDF-Export komprimiert Streams verlustfrei.
- **Unterschriften:** gezeichnete Bilder, keine Zertifikatssignaturen. Bearbeitung und Neu-Export
  können vorhandene digitale Signaturen ungültig machen; es gibt keine Signaturprüfung.
- **Passwörter:** werden nur für den Export genutzt und nicht gespeichert. Ohne Exportpasswort
  wird auch eine zuvor geschützte Quelle als unverschlüsselte Kopie ausgegeben.
  Keine Kommas/Steuerzeichen, maximal 100 UTF-8-Bytes.
- **Zusammenführen:** die angehängten Kopien werden vorher visuell eingebettet; ihre interaktiven
  Felder und Anmerkungen sind danach statisch. Links/Bookmarks werden nicht umfassend migriert.
- **OCR:** Textauszug, kein suchbarer Textlayer über den Originalseiten.
- **Nicht enthalten:** layouttreue Office-Konvertierung, Formularentwurf/XFA, PDF/A-/PDF/UA-Prüfung,
  vollständiges PDF-Tagging, Vektorobjekt-Editor, digitale Zertifikatssignaturen, Cloud-Zusammenarbeit.
- Große PDFs können viel RAM benötigen. Dateigrenze: 150 MB; Rendergrenze: 12 Megapixel pro Seite.

## Entwicklung und Prüfung

Die Dateien in `dist` sind der unminifizierte App-Quellcode. Abhängigkeiten sind mit Versionen
gebündelt. `package-lock.json` fixiert die verwendeten Pakete.

```
npm ci
node scripts/vendor.mjs
node scripts/package.mjs
node --test tests/engine.test.mjs tests/privacy.test.mjs
```

`scripts/vendor.mjs` kopiert die unveränderten Abhängigkeiten. `scripts/package.mjs` erzeugt
die erlaubte Assetliste, den Offlinecache und das kleine Quellcode-ZIP. Nach Änderungen ausführen.

Prüfung dieser Ausgabe: echte PDF-Roundtrips, Formulardaten, Textersetzung und Schriften,
Schwärzung, Bild-PDF, Verschlüsselung, Seitenoperationen, Unicode-Textausgabe, Netzwerkfilter
und Assetreferenzen automatisiert geprüft. Beispiel-PDF visuell geprüft.
Kein vollständiger interaktiver Browsertest in der Erstellungsumgebung; lokale Translator-API
und tatsächlicher Browser-OCR-Start bleiben am Zielgerät zu prüfen. Node-OCR prüft separat
die gebündelten Sprachmodelle. Siehe `VERIFICATION.md` für den konkreten Prüfstand.

## Lizenz und Quellen

Folio: GNU AGPL-3.0-only. Vollständiger App-Quellcode ist enthalten und in der App über
`Privatsphäre → Quellcode herunterladen` zugänglich. Verwendete Bibliotheken behalten ihre Lizenzen.
MuPDF steht unter AGPL bzw. einer separat zu erwerbenden kommerziellen Lizenz.
Beim Weiterverteilen die Lizenz- und Quellcodehinweise erhalten. Ein geschlossenes proprietäres
Produkt ist mit diesem Paket nicht als fertige Lizenzierungsentscheidung vorgesehen.

- MuPDF 1.28.1: https://www.npmjs.com/package/mupdf/v/1.28.1
- MuPDF korrespondierender C-/WASM-Quellcode und Buildanleitung:
  https://github.com/ArtifexSoftware/mupdf/tree/1.28.1/platform/wasm
- Tesseract.js 7.0.0: https://github.com/naptha/tesseract.js/tree/v7.0.0
- Tesseract.js-core 7.0.0: https://github.com/naptha/tesseract.js-core/tree/v7.0.0
- OCR-Sprachpakete 1.0.0: https://github.com/naptha/tessdata
- fflate 0.8.2: https://github.com/101arrowz/fflate/tree/v0.8.2
- Browserübersetzung: https://developer.chrome.com/docs/ai/translator-api

Die Runtimebibliotheken liegen unverändert unter `dist/vendor`; Lizenztexte unter `dist/licenses`.
`dist/THIRD_PARTY.html` verlinkt zu vollständigen Quellen und Buildanleitungen der unveränderten
Open-Source-Komponenten. Es werden keine persönlichen Dateien mit dem Quellcode ausgeliefert.

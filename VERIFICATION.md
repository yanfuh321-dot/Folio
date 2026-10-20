# Verification · Folio 1.0

Build date: 2026-10-19. No personal documents were used.

## Completed checks

`node --test tests/engine.test.mjs tests/privacy.test.mjs tests/ocr.test.mjs`

15 test groups cover:

- Valid/invalid page ranges, loading, rendering, actual text extraction and search.
- Latin and Chinese text annotations, real text replacement, repeated export/edit cycles,
  reopened PDF inspection, undo and redo. A font-object renumbering bug discovered during
  repeated-export testing was fixed by compacting only the exported copy.
- Redaction of a known secret string; no extracted occurrence after full PDF export.
- Raster export creates a fresh document with no text layer, fields, metadata or attachments.
- Interactive field values survive reopening; flatten removes widgets.
- AES-256 export rejects an incorrect password and opens with the correct one.
- Rotate/crop/reorder/duplicate/delete/blank/merge/range export.
- Drawing, shapes, notes, image stamps, watermarks, numbers and metadata.
- Selectable German, English and Chinese text in newly typeset text-PDF exports.
- Atomic failure when a replacement does not fit; original content remains.
- Version 1.0 network guard blocked remote paths, arbitrary same-origin paths, query strings, POST,
  request bodies, custom headers, WebSockets and beacons.
- Offline asset manifest resolves to actual program files and excludes PDFs.
- Bundled OCR models for English, German and Chinese recognize synthetic local images,
  using the exact distributed OCR core in Node. Chinese OCR may introduce spaces between
  characters; extraction always requires human proofreading.

An independent pypdf inspection confirmed that the canonical AcroForm field tree, page widget
values and nonempty appearance dictionaries agree after filling text/choice/checkbox fields.
The rendered PDF with German and Chinese text, a replacement line and forms was visually inspected.
JavaScript files were syntax-checked. Static asset references and duplicate HTML IDs were checked.

## Not verified here

- No interactive browser automation or UI screenshots: the required browser-QA capability
  was unavailable in the managed environment.
- Actual browser events, pointer interactions, service-worker installation and browser OCR
  startup need a smoke check on the target device. Engine/OCR tests are not a substitute.
- The native Chrome Translator API and model downloads cannot be exercised in Node.
  Availability and failures are handled at runtime; there is no remote fallback.
- Not a penetration test or an audit of every third-party dependency. No guarantee against
  malicious browser extensions, a compromised operating system, or altered hosted source.
- No exhaustive testing of every PDF variant, XFA, tagged PDFs, unusual embedded fonts,
  complex rotated text, or very large documents.

## Recommended first-device smoke check

Open a non-confidential sample PDF. Add text, replace one line, draw a shape, fill a field,
rotate a page and export. Reopen the export in a separate PDF viewer. Then try OCR,
the desired translation pair, and Offline vorbereiten. Disconnect the network and reopen
the app to confirm the intended offline workflow on that device.

# Version 2.0 extension verification · 2026-10-20

The complete test suite now covers 22 groups including the original regressions and:

- Paragraph removal/replacement, movement, wrapping, Latin/CJK, alignment, re-editing,
  undo and atomic overflow failure. The resulting PDF was rendered and visually inspected.
- Office export does not mutate the active PDF. Word packages contain editable VML textboxes
  and a background with horizontal text removed; visual mode embeds page images.
- Independent python-docx/lxml checks read multi-section Word packages and their XML.
  openpyxl opens cell-based and image-based workbooks. Table rows/columns, leading zeros,
  numeric conversion and formula-like text remain correctly typed.
- OpenRouter payloads, strict provider policy, no-cookie/no-redirect behavior, chunking,
  partial results, cancellation and output truncation detection tested with mocked HTTP.
- Guard allows only the exact two OpenRouter endpoints in the main window. Workers cannot
  access them. Other egress remains blocked. API keys and document data are not persisted.
- The actual browser signing bundle reads a synthetic RSA P12, rejects its wrong password,
  generates a detached CMS/SHA-256 signature and rejects a second signature.
- OpenSSL independently verifies the PDF's ByteRange/CMS signature. Deliberate modification
  fails verification. This validates integrity, not certificate trust (test cert is self-signed).
- PKCS#12 is synthetic test material and is never included in the app or GitHub ZIP.

Additional limits: No live OpenRouter request with a paid key; no browser UI/end-to-end test
because the required browser capability is unavailable. No visual Word/Excel rendering in
Microsoft Office/LibreOffice was available; editable layout fidelity must be checked there.
No trust-chain/revocation validation, QES or trusted timestamp authority integration.

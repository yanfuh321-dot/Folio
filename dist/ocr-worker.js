// Classic worker entry point: privacy guards run before the OCR library.
importScripts('./network-guard.js', './vendor/ocr/worker.min.js');

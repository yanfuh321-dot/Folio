"""Serve only Folio program files on loopback. No uploads or PDF-processing API."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import mimetypes
import webbrowser

ROOT = Path(__file__).resolve().parent.parent / 'dist'
mimetypes.add_type('application/wasm', '.wasm')
mimetypes.add_type('application/javascript', '.js')

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.headers.get('Host') not in ('127.0.0.1:8765', 'localhost:8765'):
            self.send_error(403); return
        if '?' in self.path:
            self.send_error(400); return
        super().do_GET()
    def do_POST(self): self.send_error(405, 'Uploads are disabled')
    def do_PUT(self): self.send_error(405, 'Uploads are disabled')
    def do_DELETE(self): self.send_error(405, 'Read-only server')
    def list_directory(self, path): self.send_error(403, 'Directory listing disabled')
    def log_message(self, fmt, *args): pass
    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

if __name__ == '__main__':
    with ThreadingHTTPServer(('127.0.0.1', 8765), Handler) as server:
        print('Folio: http://127.0.0.1:8765/\nStoppen: Strg+C')
        webbrowser.open('http://127.0.0.1:8765/')
        try: server.serve_forever()
        except KeyboardInterrupt: pass

"""Serve this course locally and open its homepage. No calculation backend."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

root=Path(__file__).resolve().parent
handler=partial(SimpleHTTPRequestHandler,directory=str(root))
SimpleHTTPRequestHandler.extensions_map['.wasm']='application/wasm'
SimpleHTTPRequestHandler.extensions_map['.mjs']='text/javascript'
SimpleHTTPRequestHandler.extensions_map['.js']='text/javascript'
SimpleHTTPRequestHandler.extensions_map['.css']='text/css'
SimpleHTTPRequestHandler.extensions_map['.svg']='image/svg+xml'
server=ThreadingHTTPServer(('127.0.0.1',0),handler)
url=f'http://127.0.0.1:{server.server_port}/'
print(f'Course preview: {url}\nKeep this window open. Press Ctrl+C to stop.')
webbrowser.open(url)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()

import http.server
import socketserver
import sys
import hashlib
import base64
from urllib.parse import urlparse, parse_qs
from .config import get_config, save_config

PORT = 3210

class Handler(http.server.SimpleHTTPRequestHandler):

  def log_message(self, format, *args):
    pass

  def do_GET(self):
    url = urlparse(self.path)
    if url.path == '/':
      query_components = parse_qs(url.query)
      jwt = query_components.get('jwt', None)

      if jwt:
        jwt = jwt[0]

        # Create MD5 hash
        md5_hash = hashlib.md5(jwt).digest()

        # Base64 encode the MD5 hash
        md5_hash = base64.b64encode(md5_hash).decode()


        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(b"Login successful, you can close this window.")

        # Write JWT token as a dot file in the user's home directory
        config = get_config()
        config["jwt"] = jwt
        config["tokenHash"] = md5_hash
        save_config(config)
        
        sys.exit(0)

      else:
        self.send_error(400, "Bad Request", "Missing 'jwt' query parameter.")
    else:
      super().do_GET()

def start_http_server():
  with socketserver.TCPServer(("", PORT), Handler) as httpd:
    httpd.serve_forever()    
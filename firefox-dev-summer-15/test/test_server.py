import cgi
import Cookie
import sys
from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer
import unittest
import json
import SimpleHTTPServer
import SocketServer
import os.path

port = 41439

class FFAddonTest(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def do_GET(s):
        path = "." + s.path
        if not os.path.isfile(path):
            s.send_response(404)
            return;
        s.send_response(200)
        s.send_header("Content-type", "text/html")
        if "Cookie" in s.headers:
            cookie = s.headers["Cookie"]
        else:
            s.send_header("Set-Cookie", "test=foo")
        s.end_headers()
        resp = open(path, "r")
        s.wfile.write(resp.read())
        
handler = FFAddonTest
httpd = SocketServer.TCPServer(("", port), handler)

try: 
    httpd.serve_forever()
except KeyboardInterrupt:
    pass
httpd.server_close()


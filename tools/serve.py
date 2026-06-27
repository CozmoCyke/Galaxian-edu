#!/usr/bin/env python3
"""
Simple HTTP server for Galaxian-Edu local game.
Serves the app/ directory on a local port.
"""
import http.server
import socket
import sys
import os
import webbrowser


def find_free_port(start=8080, max_attempts=100):
    for port in range(start, start + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return None


def serve(app_dir, port):
    os.chdir(app_dir)

    handler = http.server.SimpleHTTPRequestHandler

    class QuietHandler(handler):
        def log_message(self, format, *args):
            pass

    httpd = http.server.HTTPServer(('127.0.0.1', port), QuietHandler)
    return httpd


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    app_dir = os.path.join(project_dir, 'app')

    if not os.path.isdir(app_dir):
        print(f"Error: app directory not found at {app_dir}")
        sys.exit(1)

    port = find_free_port(8080)
    if port is None:
        print("Error: could not find a free port")
        sys.exit(1)

    httpd = serve(app_dir, port)
    url = f"http://127.0.0.1:{port}/"

    print(f"Galaxian-Edu local server started")
    print(f"  URL:     {url}")
    print(f"  Serving: {app_dir}")
    print(f"  Port:    {port}")
    print("  Press Ctrl+C to stop the server.")
    print()

    webbrowser.open(url)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print()
        print("Server stopped.")
        httpd.server_close()


if __name__ == '__main__':
    main()

"""Authorize the Graphify pilot locally without writing OAuth credentials to disk."""

import base64
import getpass
import hashlib
import json
import secrets
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

FOLDER = "1q_DzAkxFveq1YS3nqbeOIfN958jHorqw"
ORIGIN = "http://127.0.0.1:8765"
SCOPE = "https://www.googleapis.com/auth/drive.file"


def google_json(url, *, form=None, token=None):
    data = urllib.parse.urlencode(form).encode() if form else None
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    with urllib.request.urlopen(urllib.request.Request(url, data, headers), timeout=20) as response:
        return json.load(response)


def can_add_children(token):
    url = f"https://www.googleapis.com/drive/v3/files/{FOLDER}?fields=mimeType,capabilities(canAddChildren)"
    try:
        result = google_json(url, token=token)
    except urllib.error.HTTPError as error:
        if error.code in (403, 404):
            return False
        raise
    return (
        result.get("mimeType") == "application/vnd.google-apps.folder"
        and result.get("capabilities", {}).get("canAddChildren") is True
    )


def authorize(client_id, client_secret, picker_key):
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    state = secrets.token_urlsafe(32)
    redirect_uri = ORIGIN + "/callback"
    token_data = {}
    verified = False

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def page(self, html, status=200):
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "no-referrer")
            self.end_headers()
            self.wfile.write(html.encode())

        def do_GET(self):
            nonlocal verified
            if self.headers.get("Host") != "127.0.0.1:8765":
                self.page("Invalid host.", 400)
                return
            request = urllib.parse.urlsplit(self.path)
            query = urllib.parse.parse_qs(request.query)
            if request.path == "/callback" and query.get("state") == [state] and not token_data:
                code = query.get("code", [None])[0]
                if not code:
                    self.page("Google authorization was not granted.", 400)
                    return
                try:
                    token_data.update(google_json("https://oauth2.googleapis.com/token", form={
                        "code": code, "client_id": client_id, "client_secret": client_secret,
                        "redirect_uri": redirect_uri, "grant_type": "authorization_code",
                        "code_verifier": verifier,
                    }))
                    if not token_data.get("refresh_token") or token_data.get("scope") != SCOPE:
                        self.page("No refresh token or unexpected permissions.", 400)
                        return
                    verified = can_add_children(token_data["access_token"])
                except (OSError, ValueError, KeyError):
                    self.page("Google authorization could not be verified.", 400)
                    return
                if verified:
                    self.page("Backup folder verified. Return to the terminal.")
                    return
                if not picker_key:
                    self.page("Folder access requires Google Picker. Restart with a Picker API key.", 400)
                    return
                self.send_response(303)
                self.send_header("Location", "/picker/" + state)
                self.end_headers()
            elif request.path == "/picker/" + state and token_data.get("access_token"):
                config = json.dumps({
                    "key": picker_key, "project": client_id.split("-", 1)[0],
                    "token": token_data["access_token"], "folder": FOLDER, "state": state,
                }).replace("<", "\\u003c")
                self.page("""<!doctype html><meta charset="utf-8">
<title>Graphify Drive authorization</title>
<p>Choose 01 - ROBO AI OFFICE inside ROBO AI OFFICE - GRAPHIFY.</p>
<p id="status"></p><script>
const config = """ + config + """;
function loadPicker() {
  gapi.load('picker', () => {
    const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
      .setIncludeFolders(true).setSelectFolderEnabled(true);
    new google.picker.PickerBuilder().setDeveloperKey(config.key)
      .setAppId(config.project).setOAuthToken(config.token).setOrigin(location.origin)
      .addView(view).setCallback(result => {
        if (result.action !== google.picker.Action.PICKED) return;
        if (result.docs?.[0]?.id !== config.folder) {
          document.getElementById('status').textContent = 'Incorrect folder. Reload and choose the backup folder.';
          return;
        }
        location.replace('/verify/' + config.state);
      }).build().setVisible(true);
  });
}
</script><script src="https://apis.google.com/js/api.js" onload="loadPicker()"></script>""")
            elif request.path == "/verify/" + state and token_data.get("refresh_token") and token_data.get("scope") == SCOPE:
                verified = can_add_children(token_data["access_token"])
                self.page("Backup folder verified. Return to the terminal." if verified
                          else "Write access to the backup folder could not be verified.")
            else:
                self.page("Unknown request.", 404)

    url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode({
        "client_id": client_id, "redirect_uri": redirect_uri, "response_type": "code",
        "scope": SCOPE, "access_type": "offline", "prompt": "consent",
        "code_challenge": challenge, "code_challenge_method": "S256", "state": state,
    })
    with HTTPServer(("127.0.0.1", 8765), Handler) as server:
        server.timeout = 1
        print("Continue in your browser. Select the Google account authorized for the backup folder.")
        if not webbrowser.open(url):
            print(url)
        deadline = time.monotonic() + 300
        while not verified and time.monotonic() < deadline:
            server.handle_request()
    return token_data.get("refresh_token") if verified else None


def main():
    client_id = input("OAuth Desktop client ID (v3): ").strip()
    client_secret = getpass.getpass("OAuth client secret (v3): ").strip()
    picker_key = getpass.getpass("Restricted Google Picker API key (optional if folder already granted): ").strip()
    if not client_id or not client_secret:
        raise SystemExit("Client ID and secret are required.")
    try:
        token = authorize(client_id, client_secret, picker_key)
    except (OSError, ValueError):
        raise SystemExit("Authorization could not start. Check the browser and local port 8765.") from None
    if not token:
        raise SystemExit("No refresh token saved. The backup folder was not verified.")
    try:
        subprocess.run(["clip.exe"], input=token.encode("ascii"), check=True)
    except (OSError, subprocess.CalledProcessError):
        raise SystemExit("Windows clipboard unavailable. No token was displayed or written to disk.") from None
    print("Refresh token copied. Paste it directly into GOOGLE_OAUTH_REFRESH_TOKEN in GitHub.")
    print("After saving, copy ordinary text to replace the clipboard contents.")


if __name__ == "__main__":
    main()

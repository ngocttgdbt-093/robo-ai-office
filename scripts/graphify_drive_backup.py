#!/usr/bin/env python3
"""Upload a bounded Graphify snapshot to an explicitly authorized Google Drive folder.

Credentials must only come from GitHub Actions secrets, never repo files or logs.
"""
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request
import zipfile

FILES = ("graph.json", "GRAPH_REPORT.md", "graph.html")
MAX_BYTES = 20 * 1024 * 1024

def make_archive(graph_dir: Path, commit_sha: str) -> tuple[bytes, str]:
    if not re.fullmatch(r"[a-f0-9]{40}", commit_sha):
        raise ValueError("Invalid commit SHA")
    if not (graph_dir / "graph.json").is_file():
        raise ValueError("graph.json not found: Graphify did not produce a graph")
    manifest = {"source": "robo-ai-office", "sha": commit_sha,
                "created_utc": datetime.now(timezone.utc).isoformat(), "files": {}}
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            f = graph_dir / name
            if not f.exists():
                continue
            if f.is_symlink() or not f.is_file() or f.stat().st_size > MAX_BYTES:
                raise ValueError(f"Unsafe or oversized output: {name}")
            data = f.read_bytes()
            manifest["files"][name] = hashlib.sha256(data).hexdigest()
            archive.writestr(name, data)
        archive.writestr("manifest.json", json.dumps(manifest, indent=2))
    payload = buf.getvalue()
    if len(payload) > MAX_BYTES:
        raise ValueError("Graphify archive exceeds 20 MiB")
    return payload, f"graphify-robo-ai-office-{commit_sha[:12]}.zip"

def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"Required GitHub Actions secret is missing: {name}")
    return value

def upload(payload: bytes, name: str) -> dict:
    folder_id = required_env("GRAPHIFY_DRIVE_FOLDER_ID")
    if not re.fullmatch(r"[A-Za-z0-9_-]{10,}", folder_id):
        raise ValueError("Invalid target folder ID")
    credentials = {key: required_env(key) for key in
        ("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN")}
    encoded = urllib.parse.urlencode({
        "client_id": credentials["GOOGLE_OAUTH_CLIENT_ID"],
        "client_secret": credentials["GOOGLE_OAUTH_CLIENT_SECRET"],
        "refresh_token": credentials["GOOGLE_OAUTH_REFRESH_TOKEN"],
        "grant_type": "refresh_token",
    }).encode()
    req = urllib.request.Request("https://oauth2.googleapis.com/token",
                                 data=encoded, method="POST")
    with urllib.request.urlopen(req, timeout=25) as resp:
        token = json.load(resp)["access_token"]
    boundary = "graphify_snapshot_boundary"
    metadata = json.dumps({"name": name, "parents": [folder_id],
                           "mimeType": "application/zip"}).encode()
    data = (f"--{boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n".encode()
            + metadata
            + f"\r\n--{boundary}\r\nContent-Type: application/zip\r\n\r\n".encode()
            + payload + f"\r\n--{boundary}--\r\n".encode())
    url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,md5Checksum,parents"
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/related; boundary={boundary}",
    })
    with urllib.request.urlopen(req, timeout=90) as resp:
        result = json.load(resp)
    if not result.get("id") or folder_id not in result.get("parents", []):
        raise ValueError("Google Drive returned missing file or unexpected parent")
    return {"name": result["name"], "id": result["id"], "folder_verified": True}

def main():
    sha = required_env("GITHUB_SHA")
    data, name = make_archive(Path("graphify-out"), sha)
    print(f"Snapshot prepared: {name}, {len(data)} bytes")
    result = upload(data, name)
    print(f"Upload confirmed: {result['name']}, folder verified")
    # Do not log IDs, credentials or source graph content.

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Graphify backup failed: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)

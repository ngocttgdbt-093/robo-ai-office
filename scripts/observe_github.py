#!/usr/bin/env python3
"""Read-only GitHub activity snapshot for the authorized repository."""
import json
import os
import pathlib
import urllib.error
import urllib.request
from datetime import datetime, timezone

REPO = os.environ.get("GITHUB_REPOSITORY", "ngocttgdbt-093/robo-ai-office")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
BASE = "https://api.github.com"
HEADERS = {"Accept": "application/vnd.github+json", "User-Agent": "robo-ai-office-observer", "X-GitHub-Api-Version": "2022-11-28"}
if TOKEN:
    HEADERS["Authorization"] = "Bearer " + TOKEN


def get(path):
    request = urllib.request.Request(BASE + path, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def main():
    if REPO != "ngocttgdbt-093/robo-ai-office":
        raise SystemExit("Safety stop: unauthorized repository")
    output = {"repository": REPO, "collected_at": datetime.now(timezone.utc).isoformat(), "source": "github-api", "read_only": True, "errors": []}
    endpoints = {
        "pull_requests": f"/repos/{REPO}/pulls?state=open&per_page=30",
        "workflow_runs": f"/repos/{REPO}/actions/runs?per_page=30",
    }
    for key, path in endpoints.items():
        try:
            payload = get(path)
            if key == "pull_requests":
                output[key] = [{"number": p["number"], "title": p["title"], "state": p["state"], "draft": p["draft"], "head": p["head"]["ref"], "base": p["base"]["ref"], "url": p["html_url"]} for p in payload]
            else:
                output[key] = [{"id": w["id"], "name": w["name"], "status": w["status"], "conclusion": w["conclusion"], "branch": w["head_branch"], "event": w["event"], "url": w["html_url"]} for w in payload["workflow_runs"]]
        except (urllib.error.URLError, ValueError, KeyError) as exc:
            output["errors"].append({"endpoint": key, "error_type": type(exc).__name__})
            output[key] = []
    output["health"] = "ok" if not output["errors"] else "partial"
    dest = pathlib.Path("artifacts/github-activity.json")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Observer: {output['health']}; PRs={len(output['pull_requests'])}; runs={len(output['workflow_runs'])}")
    if output["errors"]:
        raise SystemExit("Observer could not read all required endpoints")


if __name__ == "__main__":
    main()

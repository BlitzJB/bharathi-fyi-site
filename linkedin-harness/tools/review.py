#!/usr/bin/env python3
"""Interactive draft review server: edit, pick a hook, schedule via Publora.

Usage: python3 tools/review.py posts/drafts/2026-09-06-slug.md [--port N]

Serves a localhost-only page rendering the draft (reusing preview.py's
parser): tweak the post text in place, pick a date/time, and click
"Schedule via Publora". The Publora API key stays server-side (.env).
Also supports saving the edited text back into the draft file.

Endpoints:
  GET  /              the review page
  POST /api/save      {"variant": "A"|"B", "text": "..."} -> rewrite draft section
  POST /api/schedule  {"content": str, "scheduledTime": ISO-8601 UTC,
                       "mediaUrls": [str, ...]} -> Publora /create-post
"""

import json
import subprocess
import sys
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent
sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(REPO_ROOT / ".claude/skills/linkedin-skills"))

from preview import collect_images, parse_draft  # noqa: E402
from lib.publora_client import PubloraClient, PubloraError  # noqa: E402

DRAFT = None  # set in main()


def load_env() -> dict:
    """Read repo-root .env into a dict and os.environ (no dotenv dependency)."""
    import os
    env = {}
    p = REPO_ROOT / ".env"
    if p.is_file():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
                os.environ.setdefault(k.strip(), v.strip())
    return env


def render_page() -> str:
    data = parse_draft(DRAFT.read_text(encoding="utf-8"))
    data["images"] = collect_images(DRAFT, data["frontmatter"])
    env = load_env()
    data["platformId"] = env.get("LINKEDIN_PLATFORM_ID", "")
    return (
        TEMPLATE
        .replace("__DATA__", json.dumps(data))
        .replace("__TITLE__", data["frontmatter"].get("topic", DRAFT.stem))
        .replace("__PATH__", str(DRAFT))
    )


def save_edit(variant: str, text: str) -> None:
    src = DRAFT.read_text(encoding="utf-8")
    heading = "# Post\n" if variant == "A" else "# Post (variant B)\n"
    start = src.index(heading) + len(heading)
    rest = src[start:]
    nxt = rest.find("\n# ")
    end = start + (nxt if nxt != -1 else len(rest))
    DRAFT.write_text(src[:start] + "\n" + text.strip() + "\n" + src[end:], encoding="utf-8")


def host_image(name: str) -> str:
    """Upload one draft asset to Vercel Blob (public) and return its URL.

    Uses the Blob REST API with BLOB_READ_WRITE_TOKEN from .env. URLs are
    permanent and owned by the user's Vercel account, so far-future
    scheduled posts stay safe. Only files inside the draft's assets dir
    are eligible.
    """
    import mimetypes

    import requests

    p = (DRAFT.parent / "assets" / Path(name).name).resolve()
    if not p.is_file() or p.parent != (DRAFT.parent / "assets").resolve():
        raise ValueError(f"unknown asset: {name}")
    token = load_env().get("BLOB_READ_WRITE_TOKEN")
    if not token:
        raise RuntimeError("BLOB_READ_WRITE_TOKEN not set in .env")
    r = requests.put(
        f"https://blob.vercel-storage.com/li-assets/{p.name}",
        data=p.read_bytes(),
        headers={
            "Authorization": f"Bearer {token}",
            "x-content-type": mimetypes.guess_type(p.name)[0] or "application/octet-stream",
            "x-api-version": "7",
        },
        timeout=120,
    )
    r.raise_for_status()
    return r.json()["url"]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # quiet
        pass

    def _json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path not in ("/", "/index.html"):
            self.send_response(404), self.end_headers()
            return
        body = render_page().encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            req = json.loads(self.rfile.read(n) or b"{}")
            if self.path == "/api/save":
                save_edit(req["variant"], req["text"])
                self._json(200, {"ok": True, "saved": str(DRAFT)})
            elif self.path == "/api/host":
                self._json(200, {"ok": True, "url": host_image(req["name"])})
            elif self.path == "/api/schedule":
                env = load_env()
                client = PubloraClient(api_key=env.get("PUBLORA_API_KEY"))
                resp = client.create_post(
                    content=req["content"],
                    platforms=[env["LINKEDIN_PLATFORM_ID"]],
                    scheduled_time=req.get("scheduledTime") or None,
                    media_urls=[u for u in req.get("mediaUrls", []) if u.strip()] or None,
                )
                self._json(200, {"ok": True, "publora": resp})
            else:
                self._json(404, {"ok": False, "error": "unknown endpoint"})
        except PubloraError as e:
            self._json(502, {"ok": False, "error": str(e)})
        except Exception as e:  # surface everything to the UI
            self._json(500, {"ok": False, "error": f"{type(e).__name__}: {e}"})


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review &amp; schedule: __TITLE__</title>
<style>
  :root {
    --bg: #f3f2ef; --card: #ffffff; --ink: #1d1c1a; --muted: #6b6a67;
    --line: #e2e0dc; --accent: #0a66c2; --good: #1a7f37; --warn: #b4540a; --bad: #b3261e;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #17181b; --card: #212327; --ink: #ecebe8; --muted: #9b9a97;
            --line: #33353a; --accent: #6cb0ee; --good: #57ab5a; --warn: #e0823d; --bad: #e5786f; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
         font: 15px/1.45 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 26px 16px 90px; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: var(--muted); font-size: 12.5px; margin-bottom: 18px; }
  .tabs { display: flex; gap: 8px; margin-bottom: 14px; }
  .tabs button { flex: 1; padding: 9px 0; border: 1px solid var(--line); background: var(--card);
                 color: var(--ink); border-radius: 8px; font-size: 13.5px; cursor: pointer; }
  .tabs button.on { border-color: var(--accent); color: var(--accent); font-weight: 600; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 10px;
          padding: 16px; margin-bottom: 14px; }
  .who { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent);
            color: #fff; display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 17px; }
  .who .name { font-weight: 600; font-size: 14px; }
  .who .meta { color: var(--muted); font-size: 12px; }
  .post { white-space: pre-wrap; overflow-wrap: break-word; font-size: 14.5px; }
  .fold { color: var(--muted); cursor: pointer; font-size: 13.5px; margin-top: 2px; display: inline-block; }
  textarea { width: 100%; min-height: 340px; border: 1px dashed var(--line); border-radius: 8px;
             background: transparent; color: var(--ink); padding: 10px;
             font: 14.5px/1.45 inherit; font-family: inherit; resize: vertical; }
  textarea:focus { outline: none; border-color: var(--accent); border-style: solid; }
  #media { margin: 12px -16px 0; }
  #media img { display: block; width: 100%; border-top: 1px solid var(--line);
               border-bottom: 1px solid var(--line); }
  #media .cap { font-size: 11.5px; color: var(--muted); padding: 4px 16px 6px; }
  #media input { width: calc(100% - 32px); margin: 0 16px 8px; padding: 7px 9px; font-size: 12.5px;
                 border: 1px solid var(--line); border-radius: 6px; background: transparent; color: var(--ink); }
  .comment { border-top: 1px solid var(--line); margin-top: 14px; padding-top: 12px;
             font-size: 13.5px; color: var(--muted); white-space: pre-wrap; }
  .comment b { color: var(--ink); }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em;
       color: var(--muted); margin: 22px 0 8px; }
  .hook { display: block; width: 100%; text-align: left; padding: 10px 12px; margin-bottom: 6px;
          border: 1px solid var(--line); background: var(--card); color: var(--ink);
          border-radius: 8px; font-size: 13.5px; cursor: pointer; line-height: 1.4; }
  .hook.on { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
  .hook .n { color: var(--muted); margin-right: 6px; }
  .stats { display: flex; gap: 16px; font-size: 12.5px; color: var(--muted); flex-wrap: wrap; }
  .stats b { font-size: 15px; display: block; color: var(--ink); }
  .stats .ok b { color: var(--good); } .stats .warn b { color: var(--warn); }
  .sched { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .sched input[type=datetime-local] { padding: 9px; border: 1px solid var(--line); border-radius: 8px;
        background: var(--card); color: var(--ink); font-size: 14px; }
  .btn { padding: 10px 16px; border-radius: 8px; border: 1px solid var(--line);
         background: var(--card); color: var(--ink); font-size: 14px; cursor: pointer; }
  .btn.primary { background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600; }
  .btn:disabled { opacity: .5; cursor: default; }
  #status { font-size: 13.5px; margin-top: 10px; white-space: pre-wrap; }
  #status.ok { color: var(--good); } #status.err { color: var(--bad); }
  .note { font-size: 12.5px; color: var(--muted); margin-top: 8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>__TITLE__</h1>
  <div class="sub">__PATH__ &middot; editable &middot; schedules as <b id="pid"></b></div>

  <div class="tabs" id="tabs"></div>

  <div class="card">
    <div class="who">
      <div class="avatar">B</div>
      <div><div class="name">Bharathi</div><div class="meta">Platform &amp; AI engineer &middot; scheduled &middot; &#127760;</div></div>
    </div>
    <div class="post" id="postView"></div>
    <span class="fold" id="fold"></span>
    <textarea id="post" spellcheck="true" hidden></textarea>
    <button class="btn" id="editToggle" style="margin-top:10px">Edit text</button>
    <div id="media"></div>
    <div class="comment" id="firstComment"></div>
  </div>

  <div class="card"><div class="stats" id="stats"></div></div>

  <h2>Hook options (click to swap the first line)</h2>
  <div id="hooks"></div>

  <h2>Schedule</h2>
  <div class="card">
    <div class="sched">
      <input type="datetime-local" id="when">
      <button class="btn primary" id="go">Schedule via Publora</button>
    </div>
    <div class="note">Time is your local timezone; sent to Publora as UTC. Leave date empty to create a Publora draft instead.
    Media URLs must be public; empty URL fields are skipped. Cancelling a scheduled post: Publora dashboard only.
    The first comment is NOT auto-posted; paste it yourself right after the post goes live.</div>
    <div id="status"></div>
  </div>
</div>

<script>
const DATA = __DATA__;
let variant = "A";
let hookIdx = { A: 0, B: 0 };
const edited = { A: DATA.postA, B: DATA.postB };
const $ = id => document.getElementById(id);
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

$("pid").textContent = DATA.platformId || "(no LINKEDIN_PLATFORM_ID)";

function counts() {
  const t = $("post").value;
  const chars = t.length;
  const sentences = (t.match(/[.!?](\\s|$)/g) || []).length;
  const inRange = chars >= 900 && chars <= 1500;
  $("stats").innerHTML =
    '<div class="' + (inRange ? "ok" : "warn") + '"><b>' + chars + '</b>chars (target 900\\u20131300)</div>' +
    '<div class="' + (sentences >= 20 ? "ok" : "") + '"><b>' + sentences + '</b>sentences (20+ = 1.14x)</div>' +
    '<div><b>' + t.split("\\n")[0].split(/\\s+/).filter(Boolean).length + '</b>words in hook line</div>';
}

function renderHooks() {
  $("hooks").innerHTML = (DATA.hooks[variant] || []).map((h, i) =>
    '<button class="hook' + (i === hookIdx[variant] ? " on" : "") + '" data-i="' + i + '">' +
    '<span class="n">' + (i + 1) + '.</span>' + esc(h) + '</button>').join("") || '<div class="sub">none</div>';
  for (const b of $("hooks").querySelectorAll(".hook")) {
    b.addEventListener("click", () => {
      const i = +b.dataset.i;
      hookIdx[variant] = i;
      const t = $("post").value;
      const nl = t.indexOf("\\n");
      $("post").value = DATA.hooks[variant][i] + (nl === -1 ? "" : t.slice(nl));
      edited[variant] = $("post").value;
      renderView(); renderHooks(); counts();
      saveDraft();
    });
  }
}

function render() {
  const hasB = (DATA.postB || "").trim().length > 0;
  $("tabs").innerHTML =
    '<button id="tabA"' + (variant === "A" ? ' class="on"' : "") + '>Draft A</button>' +
    (hasB ? '<button id="tabB"' + (variant === "B" ? ' class="on"' : "") + '>Draft B</button>' : "");
  $("tabA").addEventListener("click", () => { variant = "A"; load(); });
  if (hasB) $("tabB").addEventListener("click", () => { variant = "B"; load(); });

  $("media").innerHTML = (DATA.images || []).map((im, i) =>
    '<img src="' + im.src + '" alt=""><div class="cap">' + esc(im.name) + '</div>' +
    '<div style="display:flex;gap:8px;margin:0 16px 8px">' +
    '<input type="url" id="murl' + i + '" style="flex:1;margin:0" placeholder="public URL (or click Host)">' +
    '<button class="btn" id="host' + i + '" data-name="' + esc(im.name) + '">Host</button></div>').join("");
  (DATA.images || []).forEach((im, i) => {
    $("host" + i).addEventListener("click", async () => {
      $("host" + i).disabled = true; $("host" + i).textContent = "Uploading\\u2026";
      const res = await api("/api/host", { name: im.name });
      $("host" + i).disabled = false; $("host" + i).textContent = "Host";
      if (res.ok) { $("murl" + i).value = res.url; }
      else { $("status").className = "err"; $("status").textContent = "Hosting failed: " + res.error; }
    });
  });

  $("firstComment").innerHTML = DATA.firstComment
    ? "<b>First comment (paste manually after it goes live)</b>\\n" + esc(DATA.firstComment) : "";
  load();
}

let editing = false;
let expanded = false;

function renderView() {
  const body = edited[variant];
  const FOLD = 210;
  $("postView").hidden = editing; $("fold").hidden = editing;
  $("post").hidden = !editing;
  $("editToggle").textContent = editing ? "Done editing" : "Edit text";
  if (editing) return;
  if (!expanded && body.length > FOLD) {
    let cut = body.lastIndexOf(" ", FOLD);
    if (cut < 120) cut = FOLD;
    $("postView").textContent = body.slice(0, cut) + "\\u2026";
    $("fold").textContent = "\\u2026see more";
  } else {
    $("postView").textContent = body;
    $("fold").textContent = body.length > FOLD ? "show less" : "";
  }
}

function load() {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("on"));
  const on = variant === "A" ? $("tabA") : $("tabB"); if (on) on.classList.add("on");
  $("post").value = edited[variant];
  expanded = false;
  renderView(); renderHooks(); counts();
}

$("post").addEventListener("input", () => { edited[variant] = $("post").value; counts(); });
$("fold").addEventListener("click", () => { expanded = !expanded; renderView(); });
$("editToggle").addEventListener("click", () => {
  const wasEditing = editing;
  editing = !editing;
  renderView();
  if (wasEditing) saveDraft();
});

async function api(path, body) {
  const r = await fetch(path, { method: "POST", headers: {"Content-Type": "application/json"},
                                body: JSON.stringify(body) });
  return r.json();
}

async function saveDraft() {
  const res = await api("/api/save", { variant, text: edited[variant] });
  $("status").className = res.ok ? "ok" : "err";
  $("status").textContent = res.ok ? "Draft file updated (" + variant + ")." : "Save failed: " + res.error;
}

$("go").addEventListener("click", async () => {
  const when = $("when").value;
  const iso = when ? new Date(when).toISOString() : null;
  const mediaUrls = (DATA.images || []).map((_, i) => $("murl" + i).value.trim()).filter(Boolean);
  const label = iso ? "schedule for " + new Date(when).toString() : "create a Publora DRAFT (no time set)";
  if (!confirm("Send to Publora: " + label + "\\n\\nImages attached: " + mediaUrls.length +
               " of " + (DATA.images || []).length + "\\n\\nThis is your per-post approval.")) return;
  $("go").disabled = true;
  $("status").className = ""; $("status").textContent = "Sending\\u2026";
  const res = await api("/api/schedule", { content: $("post").value, scheduledTime: iso, mediaUrls });
  $("go").disabled = false;
  $("status").className = res.ok ? "ok" : "err";
  $("status").textContent = res.ok
    ? "Publora accepted it.\\n" + JSON.stringify(res.publora, null, 2) +
      (iso ? "\\n\\nReminder: be online for the first 60\\u201390 min and paste the first comment." : "")
    : "Failed: " + res.error;
});

render();
</script>
</body>
</html>
"""


def main() -> None:
    global DRAFT
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit("usage: review.py <draft.md> [--port N]")
    DRAFT = Path(args[0]).resolve()
    port = 0
    if "--port" in sys.argv:
        port = int(sys.argv[sys.argv.index("--port") + 1])
    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://127.0.0.1:{srv.server_address[1]}/"
    print(url, flush=True)
    try:
        webbrowser.open(url)
    except Exception:
        subprocess.run(["open", url], check=False)
    srv.serve_forever()


if __name__ == "__main__":
    main()

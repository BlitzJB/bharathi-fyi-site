#!/usr/bin/env python3
"""Render a post draft file as a browser review page.

Usage: python3 tools/preview.py posts/drafts/2026-09-06-slug.md [--no-open]

Reads the draft's frontmatter and sections (# Hook options, # Post,
# Post (variant B), # First comment, # Notes), injects them into a
self-contained HTML page, writes it next to the draft as
.preview-<slug>.html in the system temp dir, and opens it.
"""

import base64
import json
import mimetypes
import re
import subprocess
import sys
import tempfile
from pathlib import Path

SECTION_RE = re.compile(r"^# (.+?)\s*$", re.M)


def parse_draft(text: str) -> dict:
    fm = {}
    body = text
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            for line in text[3:end].strip().splitlines():
                if ":" in line and not line.lstrip().startswith("#"):
                    k, v = line.split(":", 1)
                    fm[k.strip()] = v.strip()
            body = text[end + 4:]

    sections = {}
    matches = list(SECTION_RE.finditer(body))
    for i, m in enumerate(matches):
        start = m.end()
        stop = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        sections[m.group(1).strip()] = body[start:stop].strip()

    hooks = {"A": [], "B": []}
    current = "A"
    for line in sections.get("Hook options", "").splitlines():
        line = line.strip()
        low = line.lower()
        if low.startswith("draft a"):
            current = "A"
        elif low.startswith("draft b"):
            current = "B"
        else:
            m = re.match(r"^\d+\.\s+(.*)$", line)
            if m:
                hooks[current].append(re.sub(r"\s*(←|<-).*$", "", m.group(1)).strip())

    return {
        "images": [],
        "frontmatter": fm,
        "hooks": hooks,
        "postA": sections.get("Post", ""),
        "postB": sections.get("Post (variant B)", ""),
        "firstComment": sections.get("First comment", ""),
        "notes": sections.get("Notes", ""),
    }


def collect_images(draft: Path, fm: dict) -> list:
    """Attached media: paths named in `format: ... (attach <path>)` plus any
    file in the draft's assets/ dir whose name starts with the draft's stem.
    PNG/JPG over SVG when both exist for the same basename."""
    paths = []
    for m in re.finditer(r"attach\s+([^\s,)]+)", fm.get("format", "")):
        p = (draft.parent / m.group(1)).resolve()
        if p.exists():
            paths.append(p)
    assets = draft.parent / "assets"
    if assets.is_dir():
        for p in sorted(assets.iterdir()):
            if p.name.startswith(draft.stem) and p.suffix.lower() in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
                paths.append(p.resolve())
    seen, keep = set(), {}
    for p in paths:
        if p in seen:
            continue
        seen.add(p)
        prev = keep.get(p.stem)
        if prev is None or (prev.suffix.lower() == ".svg" and p.suffix.lower() != ".svg"):
            keep[p.stem] = p
    images = []
    for p in keep.values():
        mime = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        b64 = base64.b64encode(p.read_bytes()).decode("ascii")
        images.append({"name": p.name, "src": f"data:{mime};base64,{b64}"})
    return images


TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Draft review: __TITLE__</title>
<style>
  :root {
    --bg: #f3f2ef; --card: #ffffff; --ink: #1d1c1a; --muted: #6b6a67;
    --line: #e2e0dc; --accent: #0a66c2; --good: #1a7f37; --warn: #b4540a;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #17181b; --card: #212327; --ink: #ecebe8; --muted: #9b9a97;
            --line: #33353a; --accent: #6cb0ee; --good: #57ab5a; --warn: #e0823d; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink);
         font: 15px/1.45 -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; }
  .wrap { max-width: 620px; margin: 0 auto; padding: 28px 16px 80px; }
  h1 { font-size: 17px; margin: 0 0 2px; }
  .sub { color: var(--muted); font-size: 12.5px; margin-bottom: 20px; }
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
  #media { margin: 12px -16px 0; }
  #media img { display: block; width: 100%; border-top: 1px solid var(--line);
               border-bottom: 1px solid var(--line); cursor: zoom-in; }
  #media img.zoom { cursor: zoom-out; position: fixed; inset: 0; z-index: 9;
                    width: 100vw; height: 100vh; object-fit: contain;
                    background: rgba(0,0,0,.85); border: 0; }
  #media .cap { font-size: 11.5px; color: var(--muted); padding: 4px 16px 0; }
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
  .notes { font-size: 13px; color: var(--muted); white-space: pre-wrap; }
  .fm { font-size: 12.5px; color: var(--muted); display: grid;
        grid-template-columns: auto 1fr; gap: 2px 14px; }
  .fm b { color: var(--ink); font-weight: 600; }
</style>
</head>
<body>
<div class="wrap">
  <h1>__TITLE__</h1>
  <div class="sub">__PATH__</div>

  <div class="tabs" id="tabs"></div>

  <div class="card">
    <div class="who">
      <div class="avatar">B</div>
      <div><div class="name">Bharathi</div><div class="meta">Platform &amp; AI engineer &middot; now &middot; &#127760;</div></div>
    </div>
    <div class="post" id="post"></div>
    <span class="fold" id="fold"></span>
    <div id="media"></div>
    <div class="comment" id="firstComment"></div>
  </div>

  <div class="card"><div class="stats" id="stats"></div></div>

  <h2>Hook options (click to swap into the post)</h2>
  <div id="hooks"></div>

  <h2>Frontmatter</h2>
  <div class="card fm" id="fm"></div>

  <h2>Notes</h2>
  <div class="card notes" id="notes"></div>
</div>

<script>
const DATA = __DATA__;

let variant = "A";
let hookIdx = { A: 0, B: 0 };
let expanded = false;

const $ = id => document.getElementById(id);

function bodyFor(v) {
  const base = v === "A" ? DATA.postA : DATA.postB;
  const hooks = DATA.hooks[v] || [];
  const idx = hookIdx[v];
  if (!hooks.length || idx === 0) return base;
  // replace the first line (the default hook) with the chosen one
  const nl = base.indexOf("\\n");
  return hooks[idx] + (nl === -1 ? "" : base.slice(nl));
}

function render() {
  const hasB = (DATA.postB || "").trim().length > 0;
  $("tabs").innerHTML =
    '<button class="' + (variant === "A" ? "on" : "") + '" onclick="setVariant(\\'A\\')">Draft A</button>' +
    (hasB ? '<button class="' + (variant === "B" ? "on" : "") + '" onclick="setVariant(\\'B\\')">Draft B</button>' : "");

  const body = bodyFor(variant);
  const FOLD = 210;
  if (!expanded && body.length > FOLD) {
    let cut = body.lastIndexOf(" ", FOLD);
    if (cut < 120) cut = FOLD;
    $("post").textContent = body.slice(0, cut) + "\\u2026";
    $("fold").textContent = "\\u2026see more";
  } else {
    $("post").textContent = body;
    $("fold").textContent = body.length > FOLD ? "show less" : "";
  }

  const chars = body.length;
  const sentences = (body.match(/[.!?](\\s|$)/g) || []).length;
  const inRange = chars >= 900 && chars <= 1500;
  $("stats").innerHTML =
    '<div class="' + (inRange ? "ok" : "warn") + '"><b>' + chars + '</b>chars (target 900\\u20131300, never &lt;1000)</div>' +
    '<div class="' + (sentences >= 20 ? "ok" : "") + '"><b>' + sentences + '</b>sentences (20+ = 1.14x)</div>' +
    '<div><b>' + (DATA.hooks[variant] || []).length + '</b>hook options</div>';

  $("hooks").innerHTML = (DATA.hooks[variant] || []).map((h, i) =>
    '<button class="hook ' + (i === hookIdx[variant] ? "on" : "") + '" onclick="setHook(' + i + ')">' +
    '<span class="n">' + (i + 1) + '.</span>' + escapeHtml(h) + '</button>').join("") ||
    '<div class="sub">none listed</div>';

  $("media").innerHTML = (DATA.images || []).map(im =>
    '<img src="' + im.src + '" alt="" onclick="this.classList.toggle(\\'zoom\\')">' +
    '<div class="cap">' + escapeHtml(im.name) + '</div>').join("");

  $("firstComment").innerHTML = DATA.firstComment
    ? "<b>Staged first comment</b>\\n" + escapeHtml(DATA.firstComment) : "";
  $("notes").textContent = DATA.notes || "none";
  $("fm").innerHTML = Object.entries(DATA.frontmatter)
    .filter(([, v]) => v).map(([k, v]) => "<b>" + escapeHtml(k) + "</b><span>" + escapeHtml(v) + "</span>").join("");
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function setVariant(v) { variant = v; expanded = false; render(); }
function setHook(i) { hookIdx[variant] = i; render(); }
$("fold").addEventListener("click", () => { expanded = !expanded; render(); });
render();
</script>
</body>
</html>
"""


def main() -> None:
    args = [a for a in sys.argv[1:] if a != "--no-open"]
    if not args:
        sys.exit("usage: preview.py <draft.md> [--no-open]")
    draft = Path(args[0]).resolve()
    data = parse_draft(draft.read_text(encoding="utf-8"))
    data["images"] = collect_images(draft, data["frontmatter"])

    html = (
        TEMPLATE
        .replace("__DATA__", json.dumps(data))
        .replace("__TITLE__", data["frontmatter"].get("topic", draft.stem))
        .replace("__PATH__", str(draft))
    )
    out = Path(tempfile.gettempdir()) / f".preview-{draft.stem}.html"
    out.write_text(html, encoding="utf-8")
    print(out)
    if "--no-open" not in sys.argv:
        subprocess.run(["open", str(out)], check=False)


if __name__ == "__main__":
    main()

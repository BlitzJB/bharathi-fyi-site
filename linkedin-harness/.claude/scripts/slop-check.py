#!/usr/bin/env python3
"""PostToolUse hook: lint LinkedIn drafts in posts/ for slop and mechanical violations.

Reads the hook JSON on stdin, checks the written file if it's a post draft,
and exits 2 with findings on stderr so Claude fixes them before presenting.
Deterministic backstop for the humanizer/critic passes - catches regressions on edit.
"""
import json
import re
import sys
from pathlib import Path

BANNED_PHRASES = [
    "game-changer", "game changer", "delve", "in today's fast-paced",
    "i'm humbled", "i am humbled", "thrilled to announce", "let me be honest",
    "plot twist:", "the result?", "here's the kicker", "tag someone who",
    "comment yes", "comment \"yes\"", "agree?", "thoughts?", "let that sink in",
    "read that again", "unpopular opinion:", "fundamentally", "leverage",
    "streamline", "tapestry", "unlock the", "harness the", "elevate your",
    "revolutionize", "seamlessly", "what nobody tells you", "what most people miss",
]

def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0
    path = (payload.get("tool_input") or {}).get("file_path", "")
    if "/posts/" not in path or not path.endswith(".md"):
        return 0
    p = Path(path)
    if not p.exists():
        return 0
    text = p.read_text(encoding="utf-8")

    # Only lint the paste-ready section if present.
    m = re.search(r"^# Post\s*$(.*?)(?=^# |\Z)", text, re.M | re.S)
    body = m.group(1).strip() if m else text
    if not body:
        return 0

    problems = []
    low = body.lower()
    for phrase in BANNED_PHRASES:
        if phrase in low:
            problems.append(f'banned phrase: "{phrase}"')

    for pat, msg in [
        (r"[Ii]t's not (just )?\w[^.\n]{0,60}, it's ", 'negative parallelism "It\'s not X, it\'s Y" (-4.9% reach)'),
        (r"\*\*|^#{1,6} |\[.+\]\(.+\)", "markdown syntax in post body (LinkedIn renders none)"),
        (r"https?://", "external link in body (-18.8% median reach; move to first comment / edit in later)"),
        (r"(🚀|🔥|💯|✨){2,}", "stacked hype emojis"),
    ]:
        if re.search(pat, body, re.M):
            problems.append(msg)

    words = len(body.split())
    dashes = body.count("—") + body.count("--")
    if words and dashes > max(1, words // 100):
        problems.append(f"em-dash density too high ({dashes} in {words} words; cap ~1/100)")

    first_line = next((l.strip() for l in body.splitlines() if l.strip()), "")
    if first_line.endswith("?"):
        problems.append("first line is a question (-34% median likes; move it to the close)")
    if len(first_line.split()) > 14:
        problems.append(f"first line is {len(first_line.split())} words (target <=10)")
    if first_line.isupper() and len(first_line) > 8:
        problems.append("all-caps first line")
    if re.match(r"(?i)here's (what|how|why)|stop \w+, start", first_line):
        problems.append('banned opener pattern ("Here\'s what/how", "Stop X, start Y")')

    chars = len(body)
    hashtags = len(re.findall(r"(?<!\w)#\w+", body))
    if hashtags > 2:
        problems.append(f"{hashtags} hashtags (cap 2; hashtags don't drive reach)")

    if problems:
        print(
            f"slop-check: {p.name} ({chars} chars) has {len(problems)} issue(s):\n- "
            + "\n- ".join(problems)
            + "\nFix these in the # Post section before presenting the draft.",
            file=sys.stderr,
        )
        return 2
    return 0

if __name__ == "__main__":
    sys.exit(main())

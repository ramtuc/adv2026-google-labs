"""Day 13: Deep Research のレポートの出典を確かめる

レポートの末尾の Sources は Google のリダイレクト URL（vertexaisearch.cloud.google.com）なので、
リダイレクト先（Location）を取り出して実際の URL にする。リダイレクトはたどらないので、出典のサイトそのものには
アクセスしない（出典の 1 番目に、セキュリティソフトが遮断するサイトが入っていたため）。

実行: uv run day13/check_sources.py                   （通常版のレポート）
      uv run day13/check_sources.py max               （Deep Research Max）
      uv run day13/check_sources.py standard_strict   （形を細かく指定した依頼）
"""

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
RESULTS = HERE / "results"
UA = {"User-Agent": "Mozilla/5.0 (adv2026 source check)"}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def resolve(url: str) -> str:
    opener = urllib.request.build_opener(NoRedirect)
    try:
        opener.open(urllib.request.Request(url, headers=UA, method="HEAD"), timeout=20)
    except urllib.error.HTTPError as e:
        if e.code in (301, 302, 303, 307, 308):
            return e.headers.get("Location", "")
        return f"(HTTP {e.code})"
    except Exception as e:  # noqa: BLE001
        return f"({type(e).__name__})"
    return url


def main():
    # Windows のコンソール（cp932）でも表示できるように UTF-8 にする
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("kind", nargs="?", default="standard", help="standard、max、standard_strict など")
    args = parser.parse_args()
    kind = args.kind
    report = json.loads((RESULTS / f"report_{kind}.json").read_text(encoding="utf-8"))

    # output_text には最後の段落しか入らないことがあるので、model_output の文章をすべてつなぐ
    text = "".join(c.get("text", "") for s in report["steps"] if s["type"] == "model_output" for c in s["content"])

    sources = []
    for n, name, url in re.findall(r"^(\d+)\. \[([^\]]+)\]\((\S+)\)", text, flags=re.M):
        real = resolve(url) if "grounding-api-redirect" in url else url
        sources.append({"n": int(n), "site": name, "url": real})
        print(f"{n:>3} {real}")
    for n, name in re.findall(r"^(\d+)\. ([^\[\n]+\.pdf) \(fileSearchStores", text, flags=re.M):
        sources.append({"n": int(n), "site": "File Search", "url": name.strip()})
        print(f"{n:>3} {name.strip()}（File Search）")
    sources.sort(key=lambda s: s["n"])
    (RESULTS / f"sources_{kind}.json").write_text(json.dumps(sources, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

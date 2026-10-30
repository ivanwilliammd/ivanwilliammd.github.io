#!/usr/bin/env python3
"""Ping setiap layanan di data/services.json, tulis status.json + riwayat.

Dipakai .github/workflows/uptime.yml (tiap 15 menit). Tanpa dependensi: hanya
stdlib, supaya workflow tidak perlu `pip install` apa pun.

Arti kode:
  ok    = jaringan menjawab dengan HTTP < 500. 401/403 tetap dihitung hidup:
          aplikasi yang meminta login itu sehat, bukan mati.
  down  = tidak ada jawaban (timeout/DNS/TLS) atau HTTP >= 500.
  n/a   = belum pernah diprobe (riwayat kosong) — tidak dikarang jadi 100%.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERVICES = os.path.join(ROOT, "data", "services.json")
STATUS = os.path.join(ROOT, "status.json")
HISTORY = os.path.join(ROOT, "data", "history.json")

TIMEOUT = 10
KEEP = 672          # 672 sampel x 15 menit = 7 hari
DAY_SAMPLES = 96    # 24 jam
UA = "Mozilla/5.0 (compatible; ivanwilliammd-uptime/1.0)"


def probe(url: str) -> tuple[int, int]:
    """(kode HTTP, latensi ms). 0 berarti tidak menjawab."""
    started = time.time()
    req = urllib.request.Request(url, method="GET")
    req.add_header("User-Agent", UA)
    req.add_header("Accept", "text/html,*/*")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            resp.read(256)
            code = resp.status
    except urllib.error.HTTPError as err:
        code = err.code
    except Exception:
        code = 0
    return code, int((time.time() - started) * 1000)


def uptime(series: list, window: int | None) -> float | None:
    """Persen hidup. Kurang dari 4 sampel dianggap belum tahu, bukan 100%."""
    samples = series[-window:] if window else series
    if len(samples) < 4:
        return None
    return round(100.0 * sum(1 for s in samples if s[1]) / len(samples), 2)


def main() -> int:
    with open(SERVICES, encoding="utf-8") as fh:
        services = json.load(fh)["services"]
    with open(HISTORY, encoding="utf-8") as fh:
        history = json.load(fh)
    if not isinstance(history, dict):
        history = {}

    now = int(time.time())
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda s: probe(s["url"]), services))

    out = []
    for svc, (code, ms) in zip(services, results):
        ok = code != 0 and code < 500
        series = history.get(svc["slug"], [])
        series.append([now, 1 if ok else 0, ms])
        history[svc["slug"]] = series[-KEEP:]
        out.append({
            "slug": svc["slug"],
            "name": svc["name"],
            "url": svc["url"],
            "ok": ok,
            "code": code,
            "latency_ms": ms,
            "uptime_24h": uptime(history[svc["slug"]], DAY_SAMPLES),
            "uptime_7d": uptime(history[svc["slug"]], None),
            "samples": len(history[svc["slug"]]),
        })

    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
        "checked": len(out),
        "up": sum(1 for s in out if s["ok"]),
        "services": out,
    }
    with open(STATUS, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, indent=2, ensure_ascii=False)
    with open(HISTORY, "w", encoding="utf-8") as fh:
        json.dump(history, fh, separators=(",", ":"))

    print(f"{payload['up']}/{payload['checked']} up · {payload['generated_at']}")
    for s in out:
        mark = "ok " if s["ok"] else "DOWN"
        print(f"  {mark} {s['code']:>3} {s['latency_ms']:>5} ms  {s['name']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

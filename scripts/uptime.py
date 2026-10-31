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


def probe(url: str) -> tuple[int, int, str]:
    """(kode HTTP, latensi ms, potongan body). 0 berarti tidak menjawab."""
    started = time.time()
    req = urllib.request.Request(url, method="GET")
    req.add_header("User-Agent", UA)
    req.add_header("Accept", "text/html,*/*")
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            code = resp.status
            body = resp.read(2048).decode("utf-8", "replace")
    except urllib.error.HTTPError as err:
        code = err.code
        try:
            body = err.read(2048).decode("utf-8", "replace")
        except Exception:
            body = ""
    except Exception:
        code = 0
        body = ""
    return code, int((time.time() - started) * 1000), body


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

    def target(svc: dict) -> str:
        """Endpoint /health bila dideklarasikan, kalau tidak halaman depan."""
        path = svc.get("health")
        return svc["url"].rstrip("/") + path if path else svc["url"]

    now = int(time.time())
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda s: (probe(target(s)), target(s)), services))

    out = []
    for svc, ((code, ms, body), checked) in zip(services, results):
        if code in (404, 405) and svc.get("health"):
            # Endpoint belum ter-deploy di server itu: ukur halaman depan, dan catat.
            code, ms, body = probe(svc["url"])
            checked = svc["url"]

        # Health yang benar menjawab JSON berisi "status". HTML 200 (halaman fallback)
        # tidak dihitung sebagai bukti sehat — hanya reachable.
        verified = False
        app_status = None
        try:
            payload = json.loads(body)
            if isinstance(payload, dict) and "status" in payload:
                verified = True
                app_status = str(payload.get("status"))
            elif isinstance(payload, dict) and "status_code" in payload:
                # Gaya FastAPI (iderare /health): {"status_code":200,"detail":"..."}.
                # Kode di dalam badan lebih tepercaya daripada kode HTTP halaman.
                verified = True
                app_status = str(payload.get("status_code"))
        except Exception:
            pass

        BAD_WORDS = ("down", "degraded", "error", "fail", "unhealthy", "offline")
        bad_reported = bool(app_status) and any(w in app_status.lower() for w in BAD_WORDS)
        if app_status is not None and app_status.isdigit():
            bad_reported = int(app_status) >= 500
        ok = code != 0 and code < 500 and not bad_reported
        series = history.get(svc["slug"], [])
        series.append([now, 1 if ok else 0, ms])
        history[svc["slug"]] = series[-KEEP:]
        out.append({
            "slug": svc["slug"],
            "name": svc["name"],
            "url": svc["url"],
            "checked": checked,
            "ok": ok,
            "verified": verified,
            "app_status": app_status,
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

#!/usr/bin/env bash
# Pinger status untuk pit stop, dijalankan cron VPS tiap 15 menit.
#
# Kenapa bukan GitHub Actions: cron `schedule` di Actions bersifat best-effort.
# Jadwal */15 pada repo ini nyatanya berjalan tiap 2,8–7 jam (lihat Actions run
# history), jadi riwayat uptime-nya bolong dan angka 24 jam tidak bisa dipercaya.
# VPS ini yang memegang jadwal sebenarnya; workflow di GitHub tinggal jaring
# pengaman kalau VPS mati.
#
# Aturan commit: setiap kali status sebuah layanan berubah, atau minimal sekali
# sejam — supaya tidak ada 96 push/hari yang memicu 96 kali build Pages.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

git pull --rebase --autostash --quiet origin master 2>/dev/null || git rebase --abort 2>/dev/null || true

python3 scripts/uptime.py >/dev/null

if git diff --quiet -- status.json data/history.json; then
	exit 0
fi

# Perubahan status layanan? Bandingkan `ok` per slug dengan versi ter-commit.
berubah=$(git show HEAD:status.json 2>/dev/null | python3 -c '
import json, sys
lama = {s["slug"]: s["ok"] for s in json.load(sys.stdin).get("services", [])}
baru = {s["slug"]: s["ok"] for s in json.load(open("status.json")).get("services", [])}
print("ya" if lama != baru else "tidak")
' 2>/dev/null || echo ya)

# Commit terjadwal: minimal sejam sejak commit terakhir.
menit=$(git log -1 --format=%ct -- status.json 2>/dev/null || echo 0)
sekarang=$(date +%s)
lewat=$((sekarang - menit))

if [ "$berubah" != "ya" ] && [ "$lewat" -lt 3600 ]; then
	exit 0
fi

git add status.json data/history.json
git -c user.name="uptime-bot" -c user.email="uptime-bot@users.noreply.github.com" \
	commit --quiet -m "uptime: refresh status (vps)"
git push --quiet origin master

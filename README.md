# ivanwilliammd.github.io

A **production pit stop** — one page that lists every live service I run, with a status check the
browser performs itself. Static HTML, CSS and JavaScript: no build step, no framework, no tracking.

**Live:** https://ivanwilliammd.github.io

## What is here

| Path | Purpose |
|---|---|
| `index.html` | The page: hero, search, category filter, service grid |
| `assets/css/style.css` | One stylesheet, two themes (`data-theme="dark\|light"`) |
| `assets/js/app.js` | The `APPS` array (single source of truth), search, filtering, status probes |
| `assets/img/apps/` | Logos, downloaded from each service's own favicon |
| `assets/img/mark.svg` | Monogram used as favicon and header mark |

## Adding or changing a service

Edit the `APPS` array in `assets/js/app.js`:

```js
{ name: "SmarTerm", url: "https://terminology.ivanmd.id", cat: "Interoperability",
  logo: "terminology.ico",                      // null → monogram fallback
  desc: "One line about what it does.",
  tags: "terminology loinc snomed" }            // extra search terms
```

Drop the logo into `assets/img/apps/` with the same file name. Keep `desc` to one line: the card is
meant to be scanned, not read.

## Uptime API

`status.json` is a static JSON endpoint regenerated every 15 minutes by
[`.github/workflows/uptime.yml`](.github/workflows/uptime.yml):

```json
{
  "generated_at": "2026-10-30T00:45:27Z",
  "checked": 18,
  "up": 18,
  "services": [
    { "slug": "ivai", "name": "IVAI", "url": "https://ivai.app", "ok": true,
      "code": 200, "latency_ms": 312, "uptime_24h": 100.0, "uptime_7d": 100.0, "samples": 96 }
  ]
}
```

- Each service can declare a `health` path (`/health`, `/up`, `/api/health`); the pinger hits that
  instead of the front page and falls back to `url` only when the endpoint answers 404/405.
- `ok` = HTTP < 500 **and** the app does not report a bad status. A JSON body with a `status` field
  makes the probe `verified: true`; a 200 that is just the HTML front page is not proof of health.
  401/403 still count as up: an app asking for login is alive.
- `uptime_24h` / `uptime_7d` = share of successful probes; `null` until four samples exist —
  a single ping is not 100%.
- History (672 samples ≈ 7 days per service) lives in `data/history.json`.
- Add or change a service in `data/services.json`; the page and the pinger both read that file.

## How the status dots work

Each card issues a `fetch(url, { mode: "no-cors" })` against the service's **own** origin. A resolved
opaque response means the network answered; a rejection means it did not. Nothing is proxied or cached,
so the dot is honest about the moment the page loaded — and it can say "blocked" when a browser refuses
the request. It is a reachability hint, not uptime monitoring; real uptime lives in the deploy pipelines.

## Notes

- Portfolio: **https://ivanwilliamharsono.com**.
- Pages serves this repository from the default branch; there is no CI step to wait for.
- Licence: MIT for the code. Logos belong to their respective services.

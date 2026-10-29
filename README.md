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

## How the status dots work

Each card issues a `fetch(url, { mode: "no-cors" })` against the service's **own** origin. A resolved
opaque response means the network answered; a rejection means it did not. Nothing is proxied or cached,
so the dot is honest about the moment the page loaded — and it can say "blocked" when a browser refuses
the request. It is a reachability hint, not uptime monitoring; real uptime lives in the deploy pipelines.

## Notes

- The previous profile site (Bootstrap, `ivanwilliammd.ivanwilliamharsono.com`) is retired. The
  portfolio now lives at **https://ivanwilliamharsono.com**.
- Pages serves this repository from the default branch; there is no CI step to wait for.
- Licence: MIT for the code. Logos belong to their respective services.

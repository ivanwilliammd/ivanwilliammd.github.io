/* Production pit stop — tanpa dependensi.
   Dua sumber data:
     data/services.json  daftar layanan (satu-satunya tempat menambah layanan)
     status.json         hasil ping terjadwal (.github/workflows/uptime.yml)
   Bila status.json belum ada, halaman jatuh ke pemeriksaan dari peramban. */

const grid = document.getElementById("apps");
const chipsBox = document.getElementById("chips");
const q = document.getElementById("q");
const countEl = document.getElementById("count");
const checkedEl = document.getElementById("checked");
const emptyEl = document.getElementById("empty");
const yearEl = document.getElementById("year");

let APPS = [];
const STATUS = new Map();
let activeCat = "All";
let term = "";

const cats = () => ["All", ...new Set(APPS.map((a) => a.cat))];

function initials(name) {
  const parts = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
}

const host = (url) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

function matches(app) {
  const hay = [app.name, app.cat, app.desc, app.tags, host(app.url)].join(" ").toLowerCase();
  return (activeCat === "All" || app.cat === activeCat) && hay.includes(term);
}

function statusOf(app) {
  const live = STATUS.get(app.slug);
  if (!live) return { state: "unknown", text: "memeriksa…" };
  const up24 = typeof live.uptime_24h === "number" ? ` · ${live.uptime_24h}% 24j` : "";
  return { state: live.ok ? "ok" : "down", text: `${live.code || "—"} · ${live.latency_ms} ms${up24}` };
}

function card(app) {
  const el = document.createElement("a");
  const st = statusOf(app);
  el.className = "card";
  el.href = app.url;
  el.rel = "noopener";

  const logo = app.logo
    ? `<img src="assets/img/apps/${app.logo}" alt="" loading="lazy" width="26" height="26">`
    : `<span aria-hidden="true">${initials(app.name)}</span>`;

  el.innerHTML = `
    <button class="copy" type="button" title="Copy link">copy</button>
    <div class="card-head">
      <span class="logo">${logo}</span>
      <div>
        <p class="card-title">${app.name}</p>
        <span class="card-cat">${app.cat}</span>
      </div>
    </div>
    <p class="card-desc">${app.desc}</p>
    <div class="card-foot">
      <span class="host">${host(app.url)}</span>
      <span class="status"><span class="dot" data-state="${st.state}"></span><span class="status-text">${st.text}</span></span>
    </div>`;

  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  el.querySelector(".copy").addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(app.url);
      btn.textContent = "copied";
      setTimeout(() => (btn.textContent = "copy"), 1200);
    } catch {
      btn.textContent = "ctrl+c";
    }
  });

  return el;
}

function render() {
  grid.replaceChildren(...APPS.filter(matches).map(card));
  const shown = grid.children.length;
  countEl.textContent = `${shown} of ${APPS.length} services`;
  emptyEl.hidden = shown !== 0;
}

function buildChips() {
  chipsBox.replaceChildren(
    ...cats().map((cat) => {
      const b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.textContent = cat;
      b.setAttribute("aria-pressed", String(cat === activeCat));
      b.addEventListener("click", () => {
        activeCat = cat;
        buildChips();
        render();
      });
      return b;
    })
  );
}

/* Cadangan: tanpa status.json, periksa langsung dari peramban (no-cors). */
function probeInBrowser() {
  APPS.forEach((app) => {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 6000);
    fetch(app.url, { mode: "no-cors", cache: "no-store", signal: ctrl.signal })
      .then(() => STATUS.set(app.slug, { ok: true, code: 0, latency_ms: 0 }))
      .catch(() => STATUS.set(app.slug, { ok: false, code: 0, latency_ms: 0 }));
  });
  checkedEl.textContent = "status: diperiksa peramban";
}

async function load() {
  try {
    const [svc, st] = await Promise.all([
      fetch("data/services.json", { cache: "no-store" }).then((r) => r.json()),
      fetch(`status.json?t=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    APPS = svc.services || [];
    if (st && Array.isArray(st.services)) {
      st.services.forEach((s) => STATUS.set(s.slug, s));
      checkedEl.textContent = `${st.up}/${st.checked} up · ${new Date(st.generated_at).toLocaleTimeString()}`;
    } else {
      probeInBrowser();
    }
  } catch (err) {
    countEl.textContent = "daftar layanan tidak terbaca";
    return;
  }
  buildChips();
  render();
}

q.addEventListener("input", () => {
  term = q.value.trim().toLowerCase();
  render();
});

document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
  if (e.key === "/" && !typing) { e.preventDefault(); q.focus(); }
  if (e.key === "Escape" && typing) { q.value = ""; term = ""; render(); q.blur(); }
  if (e.key.toLowerCase() === "t" && !typing) toggleTheme();
});

const root = document.documentElement;
function applyTheme(mode) {
  root.dataset.theme = mode;
  localStorage.setItem("theme", mode);
}
function toggleTheme() {
  applyTheme(root.dataset.theme === "dark" ? "light" : "dark");
}
document.getElementById("theme").addEventListener("click", toggleTheme);
applyTheme(localStorage.getItem("theme") || "dark");

document.getElementById("recheck").addEventListener("click", () => location.reload());
yearEl.textContent = String(new Date().getFullYear());

load();

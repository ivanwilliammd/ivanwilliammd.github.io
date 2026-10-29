/* Production pit stop — logika tanpa dependensi.
   Data di bawah adalah satu-satunya sumber kebenaran daftar layanan. */

const APPS = [
  { name: "IVAI", url: "https://ivai.app", cat: "Health AI", logo: "ivai.ico",
    desc: "Custom AI for health: assistants, agents, API integrations.", tags: "ai agent llm" },
  { name: "WISH", url: "https://wish.ivai.app", cat: "Health AI", logo: "wish.ico",
    desc: "Receipt photo becomes structured expense, feeding three AI assistants.", tags: "ocr mobile finance" },
  { name: "IVAI Stock", url: "https://idxstock.ivai.app", cat: "Health AI", logo: null,
    desc: "Market intelligence agent: watchlists, fundamentals, price action.", tags: "finance agent signals" },
  { name: "SmartClaim", url: "https://claim.ivanmd.id", cat: "Health AI", logo: "claim.ico",
    desc: "Claim integrity check before submission — ICD-10, ICD-9-CM, INA-CBG.", tags: "casemix claim icd" },
  { name: "SmarTerm", url: "https://terminology.ivanmd.id", cat: "Interoperability", logo: "terminology.ico",
    desc: "ICD-10, ICD-9-CM, LOINC, SNOMED CT, KFA and KPTL in one mapping engine.", tags: "terminology loinc snomed kfa" },
  { name: "Fusion FHIR", url: "https://fusion.ivanmd.id", cat: "Interoperability", logo: "fusion.ico",
    desc: "FHIR facade and resource API for the whole ecosystem.", tags: "fhir r4 api" },
  { name: "Transformer", url: "https://transformer.ivanmd.id", cat: "Interoperability", logo: "transformer.ico",
    desc: "Mapping layer fanning one payload out to several FHIR destinations.", tags: "fhir mapping gateway" },
  { name: "IvanMD Identity", url: "https://auth.ivanmd.id", cat: "Interoperability", logo: null,
    desc: "Single sign-on (OIDC, Passport) for every ivanmd.id application.", tags: "oidc sso auth" },
  { name: "CMS", url: "https://cms.ivanmd.id", cat: "Interoperability", logo: "cms.ico",
    desc: "Content and portfolio management backend.", tags: "cms laravel" },
  { name: "IvanMD", url: "https://ivanmd.id", cat: "Clinical", logo: "ivanmd.ico",
    desc: "Medical record, teleconsultation and appointments (web + Android).", tags: "emr telemedicine android" },
  { name: "Clinix", url: "https://clinix.meditechku.com", cat: "Clinical", logo: "clinix.ico",
    desc: "Clinical pathology portfolio and laboratory reporting workflow.", tags: "laboratory lis pathology" },
  { name: "SPECTRA", url: "https://spectra.meditechku.com", cat: "Clinical", logo: null,
    desc: "Multitenant stock, ERP, POS and CRM for healthcare units.", tags: "erp pos stock crm" },
  { name: "Pay", url: "https://pay.meditechku.com", cat: "Commerce", logo: null,
    desc: "Payments and merchant settlement inside the ecosystem.", tags: "payment midtrans" },
  { name: "IVAI Link", url: "https://link.ivai.app", cat: "Commerce", logo: "link.ico",
    desc: "Invitation-only short links with QR and click analytics.", tags: "url shortener qr analytics" },
  { name: "IDI Banten", url: "https://www.idiwilayahbanten.or.id", cat: "Community", logo: "idi.ico",
    desc: "Branch organisation profile with a publication CMS.", tags: "organisation supabase nextjs" },
  { name: "Rising Star", url: "https://risingstar.ivanwilliamharsono.com", cat: "Community", logo: null,
    desc: "Tutoring services, student management and course pages.", tags: "education landing" },
  { name: "Portfolio", url: "https://ivanwilliamharsono.com", cat: "Profile", logo: null,
    desc: "The full portfolio: 22 projects, publications, experience.", tags: "cv publications portfolio" },
];

const grid = document.getElementById("apps");
const chipsBox = document.getElementById("chips");
const q = document.getElementById("q");
const countEl = document.getElementById("count");
const checkedEl = document.getElementById("checked");
const emptyEl = document.getElementById("empty");
const yearEl = document.getElementById("year");

let activeCat = "All";
let term = "";

const cats = ["All", ...new Set(APPS.map((a) => a.cat))];

function initials(name) {
  const parts = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
}

function host(url) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function matches(app) {
  const hay = [app.name, app.cat, app.desc, app.tags, host(app.url)].join(" ").toLowerCase();
  const okCat = activeCat === "All" || app.cat === activeCat;
  return okCat && hay.includes(term);
}

function card(app) {
  const el = document.createElement("a");
  el.className = "card";
  el.href = app.url;
  el.rel = "noopener";
  el.dataset.hay = [app.name, app.cat, app.desc, app.tags].join(" ").toLowerCase();

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
      <span class="status"><span class="dot" data-state="unknown"></span><span class="status-text">checking…</span></span>
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
  observeStatus();
}

function buildChips() {
  chipsBox.replaceChildren(
    ...cats.map((cat) => {
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

/* Status: permintaan no-cors ke origin layanan itu sendiri.
   Opaque response = jaringan menjawab; reject = tidak; tidak didukung = unknown. */
function probe(app, dot, label) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  fetch(app.url, { mode: "no-cors", cache: "no-store", signal: ctrl.signal })
    .then(() => { dot.dataset.state = "ok"; label.textContent = "reachable"; })
    .catch((err) => {
      const blocked = err && err.name === "AbortError";
      dot.dataset.state = blocked ? "down" : "down";
      label.textContent = blocked ? "timeout" : "no answer";
    })
    .finally(() => clearTimeout(t));
}

function observeStatus() {
  const nodes = [...grid.querySelectorAll(".card")];
  nodes.forEach((el) => {
    const app = APPS.find((a) => a.url === el.href || a.url === el.getAttribute("href"));
    if (!app) return;
    probe(app, el.querySelector(".dot"), el.querySelector(".status-text"));
  });
  checkedEl.textContent = `checked ${new Date().toLocaleTimeString()}`;
}

/* pencarian, pintasan papan tombol, tema */
q.addEventListener("input", () => { term = q.value.trim().toLowerCase(); render(); });

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

document.getElementById("recheck").addEventListener("click", observeStatus);
yearEl.textContent = String(new Date().getFullYear());

buildChips();
render();

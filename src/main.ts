import data from "./data.json"; // generated from content/ by scripts/build_content.py
import "./style.css";

type Link = { label: string; url: string };
type Portfolio = {
  profile: { name: string; tagline: string; email: string; roles: string[]; resume: string | null; socials: Link[] };
  projects: { title: string; when: string; summary: string; tags: string[]; links: Link[]; image: string | null; featured: boolean }[];
  hackathons: { event: string; project: string; when: string; summary: string; award: string | null; host: string; track: string; location: string; team_size: number | null; tags: string[]; links: Link[] }[];
  experience: { role: string; org: string; when: string; summary: string; location: string; url: string | null; highlights: string[]; tags: string[] }[];
  orgs: string[];
};

const { profile, projects, hackathons, experience, orgs } = data as Portfolio;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (id: string) => document.getElementById(id)!;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const ext = (l: Link) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`;
const tagList = (tags: string[]) =>
  tags.length ? `<div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : "";
const linkList = (links: Link[]) => (links.length ? `<div class="links">${links.map(ext).join("")}</div>` : "");

// Hero
document.title = `${profile.name} | Portfolio`;
$("brand").textContent = profile.name;
$("name").textContent = profile.name;
$("tagline").textContent = profile.tagline;
$("roles").textContent = profile.roles.join(", ");
if (profile.resume) Object.assign($("resume"), { href: profile.resume, hidden: false });
typewriter($("typed"), profile.roles);

// Marquee of every org and event, repeated so one half always outruns the viewport
if (orgs.length) {
  const reel: string[] = still ? orgs : Array(Math.ceil(8 / orgs.length)).fill(orgs).flat();
  const half = reel.map((o) => `<span>${esc(o)}</span>`).join("");
  $("marquee").innerHTML = `<p class="sr-only">${esc(orgs.join(", "))}</p>
    <div class="marquee-track" aria-hidden="true">${half}${still ? "" : half}</div>`;
} else $("marquee").hidden = true;

// Projects + tag filter
$("project-grid").innerHTML = projects
  .map(
    (p, i) => `
    <article class="card reveal${p.featured ? " featured" : ""}" style="--i: ${i % 3}">
      ${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy" />` : ""}
      <p class="meta">${esc(p.when)}</p>
      <h3>${esc(p.title)}</h3>
      <p class="muted">${esc(p.summary)}</p>
      <div class="foot">${tagList(p.tags)}${linkList(p.links)}</div>
    </article>`,
  )
  .join("");

const filters = $("filters");
// Only tags shared by 2+ projects make useful filters; most-used first.
const counts = new Map<string, number>();
for (const t of projects.flatMap((p) => p.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
const tags = ["All", ...[...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).map(([t]) => t)];
filters.hidden = tags.length < 3;
filters.innerHTML = tags
  .map((t, i) => `<button class="chip" type="button" aria-pressed="${i === 0}">${esc(t)}</button>`)
  .join("");
const cards = [...$("project-grid").children] as HTMLElement[];
filters.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("button");
  if (!btn) return;
  const idx = [...filters.children].indexOf(btn);
  for (const b of filters.children) b.setAttribute("aria-pressed", String(b === btn));
  cards.forEach((card, i) => (card.hidden = idx > 0 && !projects[i].tags.includes(tags[idx])));
});

// Hackathons
$("hack-list").innerHTML = hackathons
  .map((h) => {
    const team = h.team_size === 1 ? "Solo" : h.team_size ? `Team of ${h.team_size}` : "";
    const host = h.host && `hosted by ${h.host}`;
    const meta = [`@ ${h.event}`, host, h.track, h.location, team].filter(Boolean).map(esc).join(" · ");
    return `
    <li class="hack reveal">
      <div class="hack-date">${esc(h.when)}</div>
      <div class="hack-body">
        <h3>${esc(h.project)}</h3>
        <p class="hack-event">${meta}</p>
        <p class="muted">${esc(h.summary)}</p>
        ${tagList(h.tags)}${linkList(h.links)}
      </div>
      <div class="hack-side">${h.award ? `<span class="award">🏆 ${esc(h.award)}</span>` : ""}</div>
    </li>`;
  })
  .join("");

// Experience
$("timeline").innerHTML = experience
  .map(
    (j) => `
    <li class="job reveal">
      <div class="job-when">${esc(j.when)}${j.location ? `<br />${esc(j.location)}` : ""}</div>
      <div class="job-body">
        <h3>${esc(j.role)} <span class="at">@ ${j.url ? ext({ label: j.org, url: j.url }) : esc(j.org)}</span></h3>
        <p class="muted">${esc(j.summary)}</p>
        ${j.highlights.length ? `<ul class="highlights">${j.highlights.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        ${tagList(j.tags)}
      </div>
    </li>`,
  )
  .join("");

for (const [id, list] of Object.entries({ projects, hackathons, experience })) $(id).hidden = !list.length;

// Contact + footer
($("email") as HTMLAnchorElement).href = `mailto:${profile.email}`;
$("socials").innerHTML = profile.socials.map(ext).join("");
$("copyright").textContent = `© ${new Date().getFullYear()} ${profile.name}`;

// Theme toggle (initial theme is restored by the inline script in index.html).
// Crossfades via the View Transitions API; older browsers and reduced motion switch instantly.
$("theme").addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const flip = () => {
    root.dataset.theme = dark ? "light" : "dark";
    try {
      localStorage.setItem("theme", root.dataset.theme);
    } catch {}
  };
  if (still || !("startViewTransition" in document)) flip();
  else document.startViewTransition(flip);
});

// Reveal on scroll
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add("in");
      io.unobserve(e.target);
    }
  },
  { rootMargin: "0px 0px -8% 0px" },
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

function typewriter(el: HTMLElement, words: string[]) {
  el.hidden = !words.length;
  if (still || words.length < 2) {
    el.textContent = words[0] ?? "";
    return;
  }
  let w = 0, n = 0, back = false;
  const tick = () => {
    n += back ? -1 : 1;
    el.textContent = words[w].slice(0, n);
    let wait = back ? 35 : 80;
    if (!back && n === words[w].length) [back, wait] = [true, 1800];
    else if (back && n === 0) [back, w, wait] = [false, (w + 1) % words.length, 400];
    setTimeout(tick, wait);
  };
  tick();
}

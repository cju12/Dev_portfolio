import data from "./data.json"; // generated from content/ by scripts/build_content.py

type Link = { label: string; url: string };
type AboutTab = { tab: string; text: string[]; points: string[]; facts: { label: string; value: string }[]; groups: { name: string; items: string[] }[] };
type Portfolio = {
  profile: { name: string; tagline: string; email: string; roles: string[]; resume: string | null; photo: string | null; socials: Link[]; about: AboutTab[] };
  projects: { title: string; when: string; points: string[]; tags: string[]; links: Link[]; image: string | null; logo: string | null; featured: boolean }[];
  hackathons: { event: string; project: string; when: string; points: string[]; award: string | null; host: string; track: string; location: string; team_size: number | null; tags: string[]; links: Link[]; logo: string | null; image: string | null }[];
  experience: { role: string; org: string; when: string; summary: string; location: string; url: string | null; logo: string | null; highlights: string[]; tags: string[] }[];
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
// Tech logos live in public/icons/, named after the item ("C++" -> cplusplus.svg, "Node.js" -> nodejs.svg).
// An item with no matching file just shows its name.
const techList = (items: string[]) =>
  `<ul class="tech">${items
    .map((t) => {
      const file = t.toLowerCase().replace(/\+/g, "plus").replace(/[^a-z0-9]/g, "");
      return `<li><img src="icons/${file}.svg" alt="" onerror="this.remove()" />${esc(t)}</li>`;
    })
    .join("")}</ul>`;
const bullets = (points: string[]) =>
  points.length ? `<ul class="points">${points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : "";
// A row of buttons where exactly one is pressed; calls back with the pressed index.
const toggleRow = (row: HTMLElement, labels: string[], onPick: (idx: number) => void, cls = "") => {
  row.innerHTML = labels.map((l, i) => `<button class="${cls}" type="button" aria-pressed="${i === 0}">${esc(l)}</button>`).join("");
  row.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest("button");
    if (!btn) return;
    const idx = [...row.children].indexOf(btn);
    [...row.children].forEach((b, i) => b.setAttribute("aria-pressed", String(i === idx)));
    onPick(idx);
  });
};
// Space marks (24x24, cream via currentColor, sand accents) for entries without a logo.
// Each name takes the next unused mark, so a project keeps one mark across sections.
const SAND = "#c9b18c";
const SHAPES = [
  // black hole: back of the disk, the hole, then the front of the disk over it
  `<g transform="rotate(-15 12 12)"><circle cx="12" cy="12" r="8" fill="${SAND}" opacity=".18"/><ellipse cx="12" cy="12" rx="11" ry="3.2" fill="none" stroke="${SAND}" stroke-width="1.4"/><circle cx="12" cy="12" r="5" fill="#05070f" stroke="currentColor" stroke-width="1.5"/><path d="M1 12a11 3.2 0 0 0 22 0" fill="none" stroke="${SAND}" stroke-width="1.4"/></g>`,
  // saturn: back half of the ring, planet, front half
  `<g transform="rotate(-20 12 12)" fill="none" stroke="${SAND}" stroke-width="1.6"><path d="M1.5 12a10.5 3.4 0 0 1 21 0"/><circle cx="12" cy="12" r="6" fill="currentColor" stroke="none"/><path d="M1.5 12a10.5 3.4 0 0 0 21 0"/></g>`,
  // jupiter: banded planet with the red spot
  `<circle cx="12" cy="12" r="8.5"/><path d="M6.1 7.5h11.8M4.7 11h14.6M5.3 15h13.4" stroke="${SAND}" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="15" cy="15.3" rx="2.2" ry="1.3" fill="#b5653f"/>`,
  // crescent moon with craters and a star
  `<g transform="rotate(-20 12 12)"><path d="M15.9 5A8 8 0 1 0 15.9 19 7 7 0 0 1 15.9 5z"/><circle cx="7" cy="13" r="1.2" fill="#0b1d39" opacity=".3"/><circle cx="9" cy="17.5" r=".8" fill="#0b1d39" opacity=".3"/></g><path d="M18.5 6c.18 1.11.89 1.82 2 2-1.11.18-1.82.89-2 2-.18-1.11-.89-1.82-2-2 1.11-.18 1.82-.89 2-2z" fill="${SAND}"/>`,
  // comet
  `<path d="M13.9 5.9 3 21l14.2-10.9z" fill="${SAND}" opacity=".35"/><path d="M14.6 7 5.5 18.5l10.4-8.1z" fill="${SAND}" opacity=".7"/><circle cx="16" cy="8" r="3.2"/><circle cx="6" cy="6" r=".8"/><circle cx="20" cy="18" r=".6"/>`,
  // spiral galaxy
  // spiral galaxy: two log-spiral arms (sampled points), tilted and squashed
  `<circle cx="12" cy="12" r="5" fill="${SAND}" opacity=".25"/><path d="M13.2 11.5 13.4 11.7 13.5 12 13.6 12.4 13.4 12.9 13.2 13.3 12.8 13.8 12.2 14.2 11.4 14.5 10.6 14.7 9.6 14.6 8.7 14.3 7.8 13.8 7.1 12.9 6.6 11.8 6.5 10.5 6.9 8.9 7.8 7.3 9.3 5.7M10.8 12.5 10.6 12.3 10.5 12 10.4 11.6 10.6 11.1 10.8 10.7 11.2 10.2 11.8 9.8 12.6 9.5 13.4 9.3 14.4 9.4 15.3 9.7 16.2 10.2 16.9 11.1 17.4 12.2 17.5 13.5 17.1 15.1 16.2 16.7 14.7 18.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.8"/><circle cx="4" cy="18" r=".7" fill="${SAND}"/><circle cx="20" cy="5" r=".7" fill="${SAND}"/>`,
  // planet with a moon on a dashed orbit
  `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-dasharray="2 2.2" opacity=".5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 6.5a5.5 5.5 0 0 1 0 11 7 7 0 0 0 0-11z" fill="#0b1d39" opacity=".3"/><circle cx="18.4" cy="5.6" r="1.8" fill="${SAND}"/>`,
  // twinkling stars
  `<path d="M10 5.5c.67 4.17 3.33 6.83 7.5 7.5-4.17.67-6.83 3.33-7.5 7.5-.67-4.17-3.33-6.83-7.5-7.5 4.17-.67 6.83-3.33 7.5-7.5z"/><path d="M18.5 3c.22 1.39 1.11 2.28 2.5 2.5-1.39.22-2.28 1.11-2.5 2.5-.22-1.39-1.11-2.28-2.5-2.5 1.39-.22 2.28-1.11 2.5-2.5z" fill="${SAND}"/>`,
];
const shapes = new Map<string, string>();
const shape = (name: string) => {
  if (!shapes.has(name)) shapes.set(name, SHAPES[shapes.size % SHAPES.length]);
  return shapes.get(name)!;
};
const titleRow = (logo: string | null, name: string, title: string) =>
  `<div class="title-row">${
    logo
      ? `<img class="logo" src="${esc(logo)}" alt="" />`
      : `<span class="logo mark" aria-hidden="true"><svg viewBox="0 0 24 24">${shape(name)}</svg></span>`
  }<h3>${title}</h3></div>`;

// Hero
document.title = `${profile.name} | Portfolio`;
$("brand").textContent = profile.name;
$("name").textContent = profile.name;
$("tagline").textContent = profile.tagline;
if (profile.resume) Object.assign($("resume"), { href: profile.resume, hidden: false });
// Each role is its own masked line, sliding up just after the name
$("roles").hidden = !profile.roles.length;
$("roles").innerHTML = profile.roles
  .map((r, i, all) => `<span class="line" style="--i: ${i + 1}"><span>${esc(r)}${i < all.length - 1 ? `<span class="sep">/</span>` : ""}</span></span>`)
  .join("");

// Who I am: one button per [[about]] tab, one panel per tab
if (profile.photo) Object.assign($("photo"), { src: profile.photo, alt: `Portrait of ${profile.name}`, hidden: false });
const panels = $("about-panels");
panels.innerHTML = profile.about
  .map(
    (t, i) => `
    <div class="panel"${i ? " hidden" : ""}>
      ${t.text.map((p) => `<p>${esc(p)}</p>`).join("")}
      ${bullets(t.points)}
      ${t.facts.length ? `<dl class="facts">${t.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join("")}</dl>` : ""}
      ${t.groups.length ? `<div class="stack">${t.groups.map((g) => `<div class="stack-group"><h3>${esc(g.name)}</h3>${techList(g.items)}</div>`).join("")}</div>` : ""}
    </div>`,
  )
  .join("");
toggleRow($("about-tabs"), profile.about.map((t) => t.tab), (idx) =>
  [...panels.children].forEach((p, i) => ((p as HTMLElement).hidden = i !== idx)),
);

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
      ${titleRow(p.logo, p.title, esc(p.title))}
      ${bullets(p.points)}
      <div class="foot">${tagList(p.tags)}${linkList(p.links)}</div>
    </article>`,
  )
  .join("");

// Only tags shared by 2+ projects make useful filters; most-used first.
const counts = new Map<string, number>();
for (const t of projects.flatMap((p) => p.tags)) counts.set(t, (counts.get(t) ?? 0) + 1);
const tags = ["All", ...[...counts].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).map(([t]) => t)];
const cards = [...$("project-grid").children] as HTMLElement[];
$("filters").hidden = tags.length < 3;
toggleRow($("filters"), tags, (idx) =>
  cards.forEach((card, i) => (card.hidden = idx > 0 && !projects[i].tags.includes(tags[idx]))),
"chip");

// Hackathons
$("hack-list").innerHTML = hackathons
  .map((h) => {
    const team = h.team_size === 1 ? "Solo" : h.team_size ? `Team of ${h.team_size}` : "";
    const host = h.host && `hosted by ${h.host}`;
    const meta = [`@ ${h.event}`, host, h.track, h.location, team].filter(Boolean).map(esc).join(" · ");
    const poster = h.image
      ? `<a href="${esc(h.image)}" target="_blank" rel="noopener"><img class="poster" src="${esc(h.image)}" alt="${esc(h.event)} poster" loading="lazy" /></a>`
      : "";
    return `
    <li class="hack reveal">
      <div class="hack-date">${esc(h.when)}</div>
      <div class="hack-body">
        ${titleRow(h.logo, h.project, esc(h.project))}
        <p class="hack-event">${meta}</p>
        ${bullets(h.points)}
        ${tagList(h.tags)}${linkList(h.links)}
      </div>
      <div class="hack-side">${h.award ? `<span class="award">🏆 ${esc(h.award)}</span>` : ""}${poster}</div>
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
        ${titleRow(j.logo, j.org, `${esc(j.role)} <span class="at">@ ${j.url ? ext({ label: j.org, url: j.url }) : esc(j.org)}</span>`)}
        <p class="muted">${esc(j.summary)}</p>
        ${bullets(j.highlights)}
        ${tagList(j.tags)}
      </div>
    </li>`,
  )
  .join("");

for (const [id, list] of Object.entries({ about: profile.about, projects, hackathons, experience })) $(id).hidden = !list.length;

// Contact + footer
($("email") as HTMLAnchorElement).href = `mailto:${profile.email}`;
$("email").textContent = profile.email;
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

# Portfolio

Projects, hackathons and experience. Content is written in TOML, then validated and compiled by Python. The page is rendered with TypeScript (Vite) and deployed to GitHub Pages.

```
content/*.toml ──▶ scripts/build_content.py ──▶ src/data.json ──▶ src/main.ts ──▶ dist/
   (you edit)        (validates, sorts, stats)     (generated)       (renders)     (deployed)
```

## Edit content

| File | What goes in it |
| --- | --- |
| `content/profile.toml` | Name, tagline, rotating roles, socials, résumé |
| `content/projects.toml` | Projects. `featured = true` makes a card large and puts it first |
| `content/hackathons.toml` | Hackathons, with optional `award` and `team_size` |
| `content/experience.toml` | Jobs and roles. Leave out `end` for a current role |

Each file lists its required and optional fields at the top. Dates use the `"YYYY-MM"` format. Images and PDFs go in `public/`, so `public/images/app.png` is referenced as `image = "images/app.png"`.

A typo, a missing field or a bad date fails the build with a message such as `projects.toml entry #2: unknown 'sumary' (typo?)`.

Section headings and the page `<title>` live in `index.html`. Colors and fonts are the tokens at the top of `src/style.css`.

## Run locally

Requires Node 22+ and Python 3.11+.

```sh
npm install
npm run dev      # http://localhost:5173 (reloads when you save a .toml file)
npm test         # tests for the content pipeline
npm run build    # writes the production site to dist/
```

## Deploy

1. Push this folder to a GitHub repo on the `main` branch.
2. In the repo, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Every push to `main` runs the tests, builds the site and deploys it. The site appears at `https://<user>.github.io/<repo>/`. If you name the repo `<user>.github.io`, it is served at the root instead.

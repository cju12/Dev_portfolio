"""Compile content/*.toml into src/data.json, the single data source for the site.

Usage: python scripts/build_content.py
Typos, missing fields and bad dates fail the build instead of silently breaking the page.
"""

import json
import sys
import tomllib
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data.json"

# section -> (required fields with their types, optional fields with their defaults)
SCHEMA = {
    "profile": (
        {"name": str, "tagline": str, "email": str},
        {"roles": [], "resume": None, "photo": None, "socials": [], "about": []},
    ),
    "projects": (
        {"title": str, "date": str, "points": list},
        {"tags": [], "links": [], "image": None, "logo": None, "featured": False},
    ),
    "hackathons": (
        {"event": str, "project": str, "date": str, "points": list},
        {"award": None, "host": "", "track": "", "location": "", "team_size": None, "tags": [], "links": [],
         "logo": None, "image": None},
    ),
    "experience": (
        {"role": str, "org": str, "start": str, "summary": str},
        {"end": None, "location": "", "url": None, "logo": None, "highlights": [], "tags": []},
    ),
}
# Each [[about]] tab in profile.toml has a name plus any of these blocks.
TAB_DEFAULTS = {"text": [], "points": [], "facts": [], "groups": []}
URL_FIELDS = ("url", "image", "logo", "photo", "resume")
LINK_FIELDS = ("links", "socials")


class ContentError(Exception):
    pass


def month(value, where):
    """'2025-03' -> 'Mar 2025'."""
    try:
        return datetime.strptime(value, "%Y-%m").strftime("%b %Y")
    except (TypeError, ValueError):
        raise ContentError(f'{where}: dates look like "2025-03", got {value!r}') from None


def check_url(url, where):
    if not isinstance(url, str) or urlparse(url).scheme not in ("", "http", "https", "mailto"):
        raise ContentError(f"{where}: unsupported url {url!r}")


def normalize(item, section, where):
    required, defaults = SCHEMA[section]
    problems = [f"missing '{k}'" for k in required if k not in item]
    problems += [f"unknown '{k}' (typo?)" for k in item if k not in required and k not in defaults]
    if problems:
        raise ContentError(f"{where}: " + ", ".join(problems))

    item = {**defaults, **item}
    problems = [f"'{k}' should be {t.__name__}" for k, t in required.items() if not isinstance(item[k], t)]
    problems += [
        f"'{k}' should be {type(d).__name__}"
        for k, d in defaults.items()
        if d is not None and type(item[k]) is not type(d)
    ]
    if problems:
        raise ContentError(f"{where}: " + ", ".join(problems))

    for key in URL_FIELDS:
        if item.get(key) is not None:
            check_url(item[key], where)
    for key in LINK_FIELDS:
        for link in item.get(key, []):
            if not isinstance(link, dict) or set(link) != {"label", "url"}:
                raise ContentError(f"{where}: {key} entries need exactly label and url")
            check_url(link["url"], where)
    if "about" in item:
        item["about"] = [about_tab(tab, where) for tab in item["about"]]
    return item


def about_tab(tab, where):
    if not isinstance(tab, dict) or not isinstance(tab.get("tab"), str) or not set(tab) <= {"tab", *TAB_DEFAULTS}:
        raise ContentError(f"{where}: each [[about]] needs a tab name and only {', '.join(TAB_DEFAULTS)}")
    tab = {**TAB_DEFAULTS, **tab}
    where = f"{where} about tab '{tab['tab']}'"
    if not all(isinstance(tab[k], list) for k in TAB_DEFAULTS):
        raise ContentError(f"{where}: {', '.join(TAB_DEFAULTS)} should be lists")
    if any(not isinstance(f, dict) or set(f) != {"label", "value"} for f in tab["facts"]):
        raise ContentError(f"{where}: facts entries need exactly label and value")
    if any(not isinstance(g, dict) or set(g) != {"name", "items"} for g in tab["groups"]):
        raise ContentError(f"{where}: groups entries need exactly name and items")
    return tab


def load(content_dir, name):
    path = content_dir / f"{name}.toml"
    if name != "profile" and not path.exists():
        return {}
    try:
        with path.open("rb") as f:
            return tomllib.load(f)
    except tomllib.TOMLDecodeError as e:
        raise ContentError(f"{path.name}: {e}") from None


def build(content_dir):
    data = {"profile": normalize(load(content_dir, "profile"), "profile", "profile.toml")}

    for section in ("projects", "hackathons", "experience"):
        items = []
        for i, raw in enumerate(load(content_dir, section).get(section, []), 1):
            where = f"{section}.toml entry #{i}"
            item = normalize(raw, section, where)
            if section == "experience":
                end = month(item["end"], where) if item["end"] else "Present"
                item["when"] = f"{month(item['start'], where)} – {end}"
            else:
                item["when"] = month(item["date"], where)
            items.append(item)
        data[section] = items

    # Hackathon builds also appear as project cards, tagged so the filter can isolate them.
    data["projects"] += [
        {"title": h["project"], "date": h["date"], "when": h["when"], "points": h["points"],
         "tags": h["tags"] + ["Hackathon"], "links": h["links"], "image": None, "logo": h["logo"], "featured": False}
        for h in data["hackathons"]
    ]

    # "YYYY-MM" strings sort chronologically. Newest first, featured projects on top.
    data["projects"].sort(key=lambda p: (p["featured"], p["date"]), reverse=True)
    data["hackathons"].sort(key=lambda h: h["date"], reverse=True)
    data["experience"].sort(key=lambda j: j["start"], reverse=True)

    data["orgs"] = list(dict.fromkeys(
        [j["org"] for j in data["experience"]] + [h["event"] for h in data["hackathons"]]
    ))
    return data


def main():
    try:
        data = build(ROOT / "content")
    except (ContentError, FileNotFoundError) as e:
        sys.exit(f"content error: {e}")
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    sections = ("projects", "hackathons", "experience")
    print(f"wrote {OUT.relative_to(ROOT)}: " + ", ".join(f"{len(data[k])} {k}" for k in sections))


if __name__ == "__main__":
    main()

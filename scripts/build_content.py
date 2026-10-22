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

# section -> (required text fields, optional fields with their defaults)
SCHEMA = {
    "profile": (
        ["name", "tagline", "email"],
        {"roles": [], "status": "", "location": "", "resume": None, "socials": []},
    ),
    "projects": (
        ["title", "date", "summary"],
        {"tags": [], "links": [], "image": None, "featured": False},
    ),
    "hackathons": (
        ["event", "project", "date", "summary"],
        {"award": None, "location": "", "team_size": None, "tags": [], "links": []},
    ),
    "experience": (
        ["role", "org", "start", "summary"],
        {"end": None, "location": "", "url": None, "highlights": [], "tags": []},
    ),
}
URL_FIELDS = ("url", "image", "resume")
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
    problems = [f"'{k}' should be text" for k in required if not isinstance(item[k], str)]
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
    return item


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

    # "YYYY-MM" strings sort chronologically. Newest first, featured projects on top.
    data["projects"].sort(key=lambda p: (p["featured"], p["date"]), reverse=True)
    data["hackathons"].sort(key=lambda h: h["date"], reverse=True)
    data["experience"].sort(key=lambda j: j["start"], reverse=True)

    data["stats"] = {
        "projects": len(data["projects"]),
        "hackathons": len(data["hackathons"]),
        "awards": sum(1 for h in data["hackathons"] if h["award"]),
    }
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
    print(f"wrote {OUT.relative_to(ROOT)}: " + ", ".join(f"{v} {k}" for k, v in data["stats"].items()))


if __name__ == "__main__":
    main()

"""Run: python -m unittest discover -s scripts"""

import tempfile
import unittest
from pathlib import Path

from build_content import ContentError, build

PROFILE = 'name = "A"\ntagline = "t"\nemail = "a@b.c"\n'


def project(title, date, extra=""):
    return f'[[projects]]\ntitle = "{title}"\ndate = "{date}"\npoints = ["p"]\n{extra}'


class BuildContentTest(unittest.TestCase):
    def setUp(self):
        self.dir = Path(self.enterContext(tempfile.TemporaryDirectory()))

    def build(self, **files):
        files.setdefault("profile", PROFILE)
        for name, text in files.items():
            (self.dir / f"{name}.toml").write_text(text, encoding="utf-8")
        return build(self.dir)

    def test_sorts_formats_and_fills_defaults(self):
        data = self.build(
            projects=project("old", "2024-01") + project("new", "2025-06") + project("star", "2023-01", "featured = true\n"),
            hackathons='[[hackathons]]\nevent = "H"\nproject = "p"\ndate = "2025-01"\npoints = ["s"]\naward = "1st"\n'
            '[[hackathons]]\nevent = "H"\nproject = "q"\ndate = "2025-01"\npoints = ["s"]\ntrack = "t"\n',
            experience='[[experience]]\nrole = "r"\norg = "O"\nstart = "2024-02"\nsummary = "s"\n',
        )
        self.assertEqual([p["title"] for p in data["projects"]], ["star", "new", "p", "q", "old"])
        self.assertEqual(data["projects"][1]["when"], "Jun 2025")
        self.assertEqual(data["projects"][1]["tags"], [])
        self.assertEqual(data["projects"][2]["tags"], ["Hackathon"])
        self.assertEqual(data["experience"][0]["when"], "Feb 2024 – Present")
        self.assertEqual(data["orgs"], ["O", "H"])

    def test_about_tabs_get_defaults(self):
        data = self.build(profile=PROFILE + '[[about]]\ntab = "Stack"\ngroups = [{ name = "Web", items = ["React"] }]\n')
        self.assertEqual(data["profile"]["about"][0]["text"], [])
        self.assertEqual(data["profile"]["about"][0]["groups"][0]["items"], ["React"])

    def test_rejects_typos(self):
        with self.assertRaisesRegex(ContentError, "unknown 'pionts'"):
            self.build(projects='[[projects]]\ntitle = "t"\ndate = "2025-01"\npionts = ["s"]\n')

    def test_rejects_bad_dates(self):
        with self.assertRaisesRegex(ContentError, "2025/01"):
            self.build(projects=project("t", "2025/01"))

    def test_rejects_wrong_types(self):
        with self.assertRaisesRegex(ContentError, "'tags' should be list"):
            self.build(projects=project("t", "2025-01", 'tags = "py"\n'))
        with self.assertRaisesRegex(ContentError, "'points' should be list"):
            self.build(projects='[[projects]]\ntitle = "t"\ndate = "2025-01"\npoints = "one line"\n')

    def test_rejects_bad_about_tabs(self):
        with self.assertRaisesRegex(ContentError, "label and value"):
            self.build(profile=PROFILE + '[[about]]\ntab = "x"\nfacts = [{ label = "x" }]\n')
        with self.assertRaisesRegex(ContentError, "needs a tab name"):
            self.build(profile=PROFILE + '[[about]]\ntext = ["no tab name"]\n')

    def test_rejects_script_links(self):
        with self.assertRaisesRegex(ContentError, "unsupported url"):
            self.build(profile=PROFILE + 'socials = [{ label = "x", url = "javascript:alert(1)" }]\n')


if __name__ == "__main__":
    unittest.main()

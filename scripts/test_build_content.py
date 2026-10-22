"""Run: python -m unittest discover -s scripts"""

import tempfile
import unittest
from pathlib import Path

from build_content import ContentError, build

PROFILE = 'name = "A"\ntagline = "t"\nemail = "a@b.c"\n'


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
            projects='[[projects]]\ntitle = "old"\ndate = "2024-01"\nsummary = "s"\n'
            '[[projects]]\ntitle = "new"\ndate = "2025-06"\nsummary = "s"\n'
            '[[projects]]\ntitle = "star"\ndate = "2023-01"\nsummary = "s"\nfeatured = true\n',
            hackathons='[[hackathons]]\nevent = "H"\nproject = "p"\ndate = "2025-01"\nsummary = "s"\naward = "1st"\n'
            '[[hackathons]]\nevent = "H"\nproject = "q"\ndate = "2025-01"\nsummary = "s"\ntrack = "t"\n',
            experience='[[experience]]\nrole = "r"\norg = "O"\nstart = "2024-02"\nsummary = "s"\n',
        )
        self.assertEqual([p["title"] for p in data["projects"]], ["star", "new", "p", "q", "old"])
        self.assertEqual(data["projects"][1]["when"], "Jun 2025")
        self.assertEqual(data["projects"][1]["tags"], [])
        self.assertEqual(data["projects"][2]["tags"], ["Hackathon"])
        self.assertEqual(data["experience"][0]["when"], "Feb 2024 – Present")
        self.assertEqual(data["orgs"], ["O", "H"])

    def test_rejects_typos(self):
        with self.assertRaisesRegex(ContentError, "unknown 'sumary'"):
            self.build(projects='[[projects]]\ntitle = "t"\ndate = "2025-01"\nsumary = "s"\n')

    def test_rejects_bad_dates(self):
        with self.assertRaisesRegex(ContentError, "2025/01"):
            self.build(projects='[[projects]]\ntitle = "t"\ndate = "2025/01"\nsummary = "s"\n')

    def test_rejects_wrong_types(self):
        with self.assertRaisesRegex(ContentError, "'tags' should be list"):
            self.build(projects='[[projects]]\ntitle = "t"\ndate = "2025-01"\nsummary = "s"\ntags = "py"\n')

    def test_rejects_script_links(self):
        with self.assertRaisesRegex(ContentError, "unsupported url"):
            self.build(profile=PROFILE + 'socials = [{ label = "x", url = "javascript:alert(1)" }]\n')


if __name__ == "__main__":
    unittest.main()

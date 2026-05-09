"""Tests for grades.py -- credential loading + grade table parsing."""
import sys
import os
import pytest
from unittest.mock import patch, MagicMock
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from grades import get_creds, parse_grade_table


# --- get_creds() ---

def test_get_creds_env_vars():
    with patch.dict(os.environ, {"D2L_USERNAME": "envuser", "D2L_PASSWORD": "envpass"}):
        user, pw = get_creds()
        assert user == "envuser"
        assert pw == "envpass"

def test_get_creds_keychain_fallback():
    with patch.dict(os.environ, {}, clear=True):
        # Remove D2L_ vars if present
        os.environ.pop("D2L_USERNAME", None)
        os.environ.pop("D2L_PASSWORD", None)
        with patch("grades.subprocess.run") as mock_run:
            mock_run.side_effect = [
                MagicMock(stdout='"acct"<blob>="kcuser"', returncode=0),
                MagicMock(stdout="kcpass\n", returncode=0),
            ]
            user, pw = get_creds()
            assert user == "kcuser"
            assert pw == "kcpass"

def test_get_creds_both_missing():
    with patch.dict(os.environ, {}, clear=True):
        os.environ.pop("D2L_USERNAME", None)
        os.environ.pop("D2L_PASSWORD", None)
        with patch("grades.subprocess.run") as mock_run:
            mock_run.side_effect = [
                MagicMock(stdout="", returncode=44),
                MagicMock(stdout="", returncode=44),
            ]
            user, pw = get_creds()
            assert user is None
            assert pw == ""


# --- parse_grade_table() ---

GRADE_HTML = """
<html><body>
<table id="z_l">
<tr><th>Grade Item</th><th>Points</th><th>Weight</th></tr>
<tr><td>Learning Guides</td><td></td><td>30 %</td></tr>
<tr><td></td><td>Unit 1 LG</td><td>3 / 3</td><td>100 %</td></tr>
<tr><td></td><td>Unit 2 LG</td><td>3 / 3</td><td>100 %</td></tr>
<tr><td>Exams</td><td></td><td>70 %</td></tr>
<tr><td></td><td>Unit 1 Exam</td><td>42 / 50</td><td>84 %</td></tr>
</table>
</body></html>
"""

def _mock_page(html):
    page = MagicMock()
    page.content.return_value = html
    return page

def test_parse_normal_scores():
    cats = parse_grade_table(_mock_page(GRADE_HTML))
    assert len(cats) == 2
    assert cats[0]["category"] == "Learning Guides"
    assert cats[0]["grade_pct"] == 30.0
    assert len(cats[0]["items"]) == 2
    assert cats[0]["items"][0]["name"] == "Unit 1 LG"
    assert cats[0]["items"][0]["score"] == 3.0
    assert cats[0]["items"][0]["out_of"] == 3.0

def test_parse_missing_scores():
    html = """
    <html><body><table id="z_l">
    <tr><th>Grade Item</th><th>Points</th></tr>
    <tr><td>Tests</td><td></td></tr>
    <tr><td></td><td>Test 1</td><td>- / 100</td></tr>
    </table></body></html>
    """
    cats = parse_grade_table(_mock_page(html))
    assert len(cats) == 1
    assert cats[0]["items"][0]["score"] is None
    assert cats[0]["items"][0]["out_of"] == 100.0

def test_parse_percentage_only():
    html = """
    <html><body><table id="z_l">
    <tr><th>Grade</th><th>Pct</th></tr>
    <tr><td>Final</td><td>92 %</td></tr>
    </table></body></html>
    """
    cats = parse_grade_table(_mock_page(html))
    assert len(cats) == 1
    assert cats[0]["grade_pct"] == 92.0

def test_parse_empty_table():
    html = '<html><body><table id="z_l"><tr><th>Grade</th></tr></table></body></html>'
    cats = parse_grade_table(_mock_page(html))
    assert cats == []

def test_parse_no_table():
    html = "<html><body><p>No grades</p></body></html>"
    cats = parse_grade_table(_mock_page(html))
    assert cats == []

def test_parse_fallback_table():
    """When z_l not found, should find table with Grade header."""
    html = """
    <html><body>
    <table><tr><th>Grade Item</th><th>Score</th></tr>
    <tr><td>Homework</td><td>85 %</td></tr>
    </table>
    </body></html>
    """
    cats = parse_grade_table(_mock_page(html))
    assert len(cats) == 1
    assert cats[0]["category"] == "Homework"

def test_parse_malformed_rows():
    html = """
    <html><body><table id="z_l">
    <tr><th>Grade</th></tr>
    <tr><td></td></tr>
    <tr><td>Cat</td><td>50 %</td></tr>
    <tr><td></td><td>Item</td><td>25 / 50</td></tr>
    </table></body></html>
    """
    cats = parse_grade_table(_mock_page(html))
    assert len(cats) == 1
    assert cats[0]["items"][0]["score"] == 25.0

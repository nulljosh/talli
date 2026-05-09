"""Tests for scrape_pdfs.py -- pure functions + mocked I/O."""
import sys
import os
import pytest
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scrape_pdfs import sanitize, find_dropbox_folder, extract_topics


# --- sanitize() ---

def test_sanitize_special_chars():
    assert sanitize("file<>name.pdf") == "file__name.pdf"

def test_sanitize_spaces():
    assert sanitize("  hello world  ") == "hello world"

def test_sanitize_slashes():
    assert sanitize("path/to/file") == "path_to_file"

def test_sanitize_empty():
    assert sanitize("") == ""

def test_sanitize_unicode():
    # combining accent is not \w, so gets replaced with _
    assert sanitize("cafe\u0301.pdf") == "cafe_.pdf"

def test_sanitize_preserves_dots_dashes():
    assert sanitize("my-file.v2.pdf") == "my-file.v2.pdf"


# --- find_dropbox_folder() ---

SAMPLE_FOLDERS = [
    {"Name": "U2 Learning Guide", "Id": 100},
    {"Name": "U3 Learning Guide", "Id": 101},
    {"Name": "U5 Learning Guide", "Id": 102},
    {"Name": "Unit 5 Exam", "Id": 103},
    {"Name": "Project Submission", "Id": 104},
]

def test_find_dropbox_exact_unit():
    result = find_dropbox_folder(SAMPLE_FOLDERS, "2")
    assert result["Id"] == 100

def test_find_dropbox_text_pattern():
    result = find_dropbox_folder(SAMPLE_FOLDERS, "Project")
    assert result["Id"] == 104

def test_find_dropbox_case_insensitive():
    result = find_dropbox_folder(SAMPLE_FOLDERS, "project")
    assert result["Id"] == 104

def test_find_dropbox_no_match():
    result = find_dropbox_folder(SAMPLE_FOLDERS, "99")
    assert result is None

def test_find_dropbox_empty_list():
    result = find_dropbox_folder([], "5")
    assert result is None

def test_find_dropbox_prefers_learning_guide():
    """Unit 5 has both LG and Exam; should prefer LG."""
    result = find_dropbox_folder(SAMPLE_FOLDERS, "5")
    assert result["Id"] == 102

def test_find_dropbox_unit_word():
    result = find_dropbox_folder(SAMPLE_FOLDERS, "unit 3")
    assert result["Id"] == 101


# --- extract_topics() ---

def test_extract_topics_nested():
    toc = {
        "Title": "Root",
        "Modules": [
            {
                "Title": "Unit 1",
                "Modules": [],
                "Topics": [
                    {"Title": "Intro", "Url": "/intro.pdf", "TypeIdentifier": "File", "TopicId": 1}
                ]
            }
        ],
        "Topics": []
    }
    topics = extract_topics(toc)
    assert len(topics) == 1
    assert topics[0]["title"] == "Intro"
    assert topics[0]["module_title"] == "Unit 1"

def test_extract_topics_empty():
    assert extract_topics({}) == []
    assert extract_topics({"Modules": [], "Topics": []}) == []

def test_extract_topics_single_module():
    toc = {
        "Title": "Course",
        "Modules": [],
        "Topics": [
            {"Title": "Syllabus", "Url": "/syl.pdf", "TypeIdentifier": "File", "TopicId": 10}
        ]
    }
    topics = extract_topics(toc)
    assert len(topics) == 1
    assert topics[0]["module_title"] == "Course"

def test_extract_topics_deep_nesting():
    toc = {
        "Title": "Root",
        "Modules": [{
            "Title": "L1",
            "Modules": [{
                "Title": "L2",
                "Modules": [],
                "Topics": [{"Title": "Deep", "Url": "/d", "TypeIdentifier": "File", "TopicId": 99}]
            }],
            "Topics": []
        }],
        "Topics": []
    }
    topics = extract_topics(toc)
    assert len(topics) == 1
    assert topics[0]["title"] == "Deep"

def test_extract_topics_list_input():
    toc = [
        {"Title": "M1", "Modules": [], "Topics": [
            {"Title": "T1", "Url": "/t1", "TypeIdentifier": "File", "TopicId": 1}
        ]}
    ]
    topics = extract_topics(toc)
    assert len(topics) == 1


# --- get_creds() (mocked) ---

def test_get_creds_keychain_success():
    with patch("scrape_pdfs.subprocess.run") as mock_run:
        mock_run.side_effect = [
            MagicMock(stdout='"acct"<blob>="testuser"', stderr="", returncode=0),
            MagicMock(stdout="testpass\n", stderr="", returncode=0),
        ]
        from scrape_pdfs import get_creds
        user, pw = get_creds()
        assert user == "testuser"
        assert pw == "testpass"

def test_get_creds_no_account():
    with patch("scrape_pdfs.subprocess.run") as mock_run:
        mock_run.side_effect = [
            MagicMock(stdout="", stderr="not found", returncode=44),
            MagicMock(stdout="", stderr="", returncode=44),
        ]
        from scrape_pdfs import get_creds
        user, pw = get_creds()
        assert user is None
        assert pw == ""


# --- get_xsrf_token() (mocked) ---

def test_get_xsrf_token_primary():
    page = MagicMock()
    resp = MagicMock()
    resp.ok = True
    resp.json.return_value = {"referrerToken": "tok123"}
    page.request.get.return_value = resp
    from scrape_pdfs import get_xsrf_token
    assert get_xsrf_token(page) == "tok123"

def test_get_xsrf_token_localstorage_fallback():
    page = MagicMock()
    resp = MagicMock()
    resp.ok = False
    page.request.get.return_value = resp
    page.evaluate.return_value = "ls_token"
    from scrape_pdfs import get_xsrf_token
    assert get_xsrf_token(page) == "ls_token"

def test_get_xsrf_token_cookie_fallback():
    page = MagicMock()
    resp = MagicMock()
    resp.ok = False
    page.request.get.return_value = resp
    page.evaluate.return_value = None
    page.context.cookies.return_value = [{"name": "XSRF.Token", "value": "cookie_tok"}]
    from scrape_pdfs import get_xsrf_token
    assert get_xsrf_token(page) == "cookie_tok"

def test_get_xsrf_token_all_fail():
    page = MagicMock()
    resp = MagicMock()
    resp.ok = False
    page.request.get.return_value = resp
    page.evaluate.return_value = None
    page.context.cookies.return_value = [{"name": "other", "value": "x"}]
    from scrape_pdfs import get_xsrf_token
    assert get_xsrf_token(page) is None

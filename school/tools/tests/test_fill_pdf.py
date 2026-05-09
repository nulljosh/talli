"""Tests for fill_pdf.py -- unit detection, fallback matching, fill logic."""
import sys
import os
import pytest
from unittest.mock import patch, MagicMock, PropertyMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fill_pdf import detect_unit, fallback_match, STUDENT_NAME


# --- detect_unit() ---

def test_detect_unit_standard():
    assert detect_unit("BI12_LG_U05.pdf") == 5

def test_detect_unit_lowercase():
    assert detect_unit("unit_u3_guide.pdf") == 3

def test_detect_unit_no_match():
    assert detect_unit("random.pdf") is None

def test_detect_unit_double_digit():
    assert detect_unit("BI12_LG_U12.pdf") == 12


# --- fallback_match() ---

def test_fallback_basic():
    blanks = [(0, None, 12, "Name: ____"), (0, None, 12, "Q1: ____")]
    key_text = "___answer one___"
    result = fallback_match(blanks, key_text)
    assert result[0] == STUDENT_NAME
    assert result[1] == "answer one"

def test_fallback_more_blanks_than_answers():
    blanks = [(0, None, 12, f"B{i}") for i in range(5)]
    key_text = "___ans1___ ___ans2___"
    result = fallback_match(blanks, key_text)
    assert len(result) == 5
    assert result[0] == STUDENT_NAME
    assert result[1] == "ans1"
    assert result[2] == "ans2"
    assert result[3] == "???"
    assert result[4] == "???"

def test_fallback_no_blanks():
    result = fallback_match([], "___answer___")
    assert result == []

def test_fallback_no_answers_in_key():
    blanks = [(0, None, 12, "Name: ____")]
    result = fallback_match(blanks, "no underscores here")
    assert result[0] == STUDENT_NAME


# --- fill_pdf() (mocked fitz) ---

def test_fill_pdf_calls_redaction():
    """Verify fill_pdf adds redaction annotations and inserts text."""
    mock_fitz = MagicMock()

    # Create a mock rect
    class MockRect:
        def __init__(self, x0, y0, x1, y1):
            self.x0, self.y0, self.x1, self.y1 = x0, y0, x1, y1
            self.width = x1 - x0
            self.height = y1 - y0

    rect = MockRect(100, 200, 300, 215)
    blanks = [(0, rect, 12.0, "Q1: ____")]
    answers = ["test answer"]

    mock_page = MagicMock()
    mock_doc = MagicMock()
    mock_doc.__getitem__ = MagicMock(return_value=mock_page)

    with patch("fill_pdf.fitz") as mock_fitz_mod:
        mock_fitz_mod.Rect = lambda *args: MagicMock(x0=args[0], y0=args[1], x1=args[2], y1=args[3])
        mock_fitz_mod.Point = lambda x, y: (x, y)
        mock_fitz_mod.get_text_length = MagicMock(return_value=50.0)

        from fill_pdf import fill_pdf
        fill_pdf(mock_doc, blanks, answers)

        mock_page.add_redact_annot.assert_called_once()
        mock_page.apply_redactions.assert_called_once()
        mock_page.insert_text.assert_called_once()

def test_fill_pdf_skips_unknown():
    """fill_pdf should skip blanks with ??? answers."""
    blanks = [(0, MagicMock(x0=0, y0=0, x1=100, y1=15, width=100, height=15), 12.0, "Q1")]
    answers = ["???"]

    mock_doc = MagicMock()
    from fill_pdf import fill_pdf
    fill_pdf(mock_doc, blanks, answers)
    # No pages should be touched
    mock_doc.__getitem__.assert_not_called()

#!/usr/bin/env python3
"""
Pre-generate quiz questions for all math and science units.
Reads filled PDFs, calls Claude CLI, writes data/quizzes.json.

Usage:
  python3 tools/generate_quizzes.py
  python3 tools/generate_quizzes.py math 3      # regenerate one unit
  python3 tools/generate_quizzes.py science     # regenerate all science
"""

import sys
import re
import json
import subprocess
import os
from pathlib import Path
from datetime import datetime, timezone

try:
    import fitz
except ImportError:
    print("ERROR: pip3 install pymupdf")
    sys.exit(1)

SCHOOL = Path.home() / "Documents" / "School"
ROOT = Path(__file__).parent.parent
DATA = ROOT / "data"
OUT = DATA / "quizzes.json"

UNITS = {
    "math": {
        i: SCHOOL / "math" / f"unit {i}" / f"PMA12_U{i:02d}_LG_FILLED.pdf"
        for i in range(1, 8)
    },
    "science": {
        i: SCHOOL / "science" / f"unit {i}" / f"BI12_LG_U{i:02d}_FILLED.pdf"
        for i in range(1, 10)
    },
}

SUBJECT_NAMES = {
    "math": "Pre-Calculus 12",
    "science": "Anatomy & Physiology 12",
}


def extract_text(pdf_path: Path, max_chars: int = 7000) -> str:
    doc = fitz.open(str(pdf_path))
    pages = [page.get_text() for page in doc]
    doc.close()
    text = "\n".join(pages)
    return text[:max_chars] if len(text) > max_chars else text


def call_claude(prompt: str) -> str:
    result = subprocess.run(
        ["claude", "-p", prompt, "--output-format", "text"],
        capture_output=True,
        text=True,
        env={k: v for k, v in os.environ.items() if k != "CLAUDECODE"},
        timeout=180,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "claude exited non-zero")
    return result.stdout.strip()


def generate_unit(subject: str, unit: int, content: str) -> list[dict]:
    name = SUBJECT_NAMES[subject]
    prompt = f"""You are a teacher for {name}, Unit {unit}.

Below is the filled learning guide content. Generate exactly 20 quiz questions that test understanding of the key concepts.

Return ONLY a JSON array of 20 objects. Each object must have exactly these keys:
- "q": question text (clear, specific)
- "a": correct answer (1-2 sentences, factual)
- "exp": explanation of why the answer is correct and what students commonly miss (2-3 sentences)

No markdown fences, no extra text, just the JSON array.

CONTENT:
{content}"""

    raw = call_claude(prompt)
    raw = re.sub(r"^```[a-z]*\n?", "", raw.strip())
    raw = re.sub(r"\n?```$", "", raw.strip())
    return json.loads(raw)


def load_existing() -> dict:
    if OUT.exists():
        with open(OUT) as f:
            return json.load(f)
    return {"math": {}, "science": {}, "generated_at": None}


def save(data: dict):
    DATA.mkdir(exist_ok=True)
    data["generated_at"] = datetime.now(timezone.utc).isoformat()
    with open(OUT, "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved: {OUT}")


def process_unit(subject: str, unit: int, data: dict) -> bool:
    pdf = UNITS[subject][unit]
    if not pdf.exists():
        print(f"  SKIP {subject} U{unit} — PDF not found: {pdf.name}")
        return False
    print(f"  Generating {subject} U{unit}...")
    try:
        content = extract_text(pdf)
        questions = generate_unit(subject, unit, content)
        if subject not in data:
            data[subject] = {}
        data[subject][str(unit)] = questions
        print(f"  Done — {len(questions)} questions")
        return True
    except Exception as e:
        print(f"  ERROR {subject} U{unit}: {e}")
        return False


def process_unit_parallel(args_tuple):
    subject, unit = args_tuple
    pdf = UNITS[subject][unit]
    if not pdf.exists():
        print(f"  SKIP {subject} U{unit} — PDF not found")
        return subject, unit, None
    print(f"  Generating {subject} U{unit}...")
    try:
        content = extract_text(pdf)
        questions = generate_unit(subject, unit, content)
        print(f"  Done {subject} U{unit} — {len(questions)} questions")
        return subject, unit, questions
    except Exception as e:
        print(f"  ERROR {subject} U{unit}: {e}")
        return subject, unit, None


def main():
    from concurrent.futures import ThreadPoolExecutor, as_completed

    args = sys.argv[1:]
    data = load_existing()

    if not args:
        tasks = [(s, u) for s in ("math", "science") for u in UNITS[s]]
    elif len(args) == 1:
        subject = args[0].lower()
        if subject not in UNITS:
            print(f"Unknown subject '{subject}'. Use: math, science")
            sys.exit(1)
        tasks = [(subject, u) for u in UNITS[subject]]
    elif len(args) == 2:
        subject = args[0].lower()
        try:
            unit = int(args[1])
        except ValueError:
            print("Unit must be a number")
            sys.exit(1)
        if subject not in UNITS or unit not in UNITS[subject]:
            print(f"Invalid: {subject} {unit}")
            sys.exit(1)
        tasks = [(subject, unit)]
    else:
        print("Usage: generate_quizzes.py [subject] [unit]")
        sys.exit(1)

    print(f"Running {len(tasks)} units in parallel...")
    with ThreadPoolExecutor(max_workers=len(tasks)) as ex:
        futures = [ex.submit(process_unit_parallel, t) for t in tasks]
        for f in as_completed(futures):
            subject, unit, questions = f.result()
            if questions is not None:
                if subject not in data:
                    data[subject] = {}
                data[subject][str(unit)] = questions

    save(data)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
D2L PDF Scraper - Downloads learning guide PDFs from Anatomy & Physiology 12.
Credentials from macOS Keychain (service: d2l-langley).
Uses D2L's content API after browser auth to discover and download files.
"""

import os
import re
import subprocess
import time
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

D2L_BASE = "https://langleysd35.onlinelearningbc.com"
COURSE_OU = "153403"
SAVE_DIR = Path.home() / "Downloads" / "d2l-science"


def get_creds():
    result = subprocess.run(
        ["security", "find-generic-password", "-s", "d2l-langley", "-g"],
        capture_output=True, text=True
    )
    acct = re.search(r'"acct"<blob>="(.+?)"', result.stdout)
    pw = subprocess.run(
        ["security", "find-generic-password", "-s", "d2l-langley", "-w"],
        capture_output=True, text=True
    )
    return acct.group(1) if acct else None, pw.stdout.strip()


def login(page, username, password):
    print("Logging in...")
    page.goto(f"{D2L_BASE}/d2l/login", timeout=30000)
    time.sleep(2)
    page.fill('input[name="loginfmt"]', username)
    time.sleep(1)
    page.click('#idSIButton9')
    time.sleep(3)
    page.fill('input[name="passwd"]', password)
    time.sleep(1)
    page.click('#idSIButton9')
    time.sleep(3)
    try:
        page.click('text="No"', timeout=5000)
        time.sleep(2)
    except:
        pass
    print("Logged in.")


def get_toc(page):
    """Use D2L API to get full content table of contents."""
    # Try multiple API versions
    for ver in ["1.67", "1.50", "1.47", "1.39"]:
        url = f"{D2L_BASE}/d2l/api/le/{ver}/{COURSE_OU}/content/toc"
        resp = page.request.get(url)
        if resp.ok:
            return resp.json()
    # Fallback: try the content root
    resp = page.request.get(f"{D2L_BASE}/d2l/api/le/1.67/{COURSE_OU}/content/root/")
    if resp.ok:
        return resp.json()
    return None


def extract_topics(toc, depth=0):
    """Recursively extract all topics from TOC structure."""
    topics = []
    if isinstance(toc, dict):
        modules = toc.get("Modules", [])
        module_topics = toc.get("Topics", [])
        title = toc.get("Title", "")

        for topic in module_topics:
            topics.append({
                "title": topic.get("Title", ""),
                "url": topic.get("Url", ""),
                "type": topic.get("TypeIdentifier", ""),
                "topic_id": topic.get("TopicId", ""),
                "module_title": title,
            })

        for module in modules:
            topics.extend(extract_topics(module, depth + 1))

    elif isinstance(toc, list):
        for item in toc:
            topics.extend(extract_topics(item, depth))

    return topics


def download_file(page, url, save_path):
    """Download a file from D2L."""
    if save_path.exists() and save_path.stat().st_size > 0:
        print(f"  SKIP: {save_path.name}")
        return False

    try:
        full_url = url if url.startswith("http") else f"{D2L_BASE}{url}"
        resp = page.request.get(full_url)
        if resp.ok and len(resp.body()) > 100:
            save_path.parent.mkdir(parents=True, exist_ok=True)
            save_path.write_bytes(resp.body())
            size_kb = len(resp.body()) // 1024
            print(f"  SAVED: {save_path.name} ({size_kb}KB)")
            return True
        else:
            print(f"  FAIL: {save_path.name} (status {resp.status})")
    except Exception as e:
        print(f"  ERROR: {save_path.name}: {e}")
    return False


def sanitize(name):
    return re.sub(r'[^\w\s\-.]', '_', name).strip()


def main():
    username, password = get_creds()
    if not username or not password:
        print("ERROR: Could not read credentials from Keychain.")
        return

    print(f"D2L PDF Scraper\nCourse OU: {COURSE_OU}\nUser: {username}\n" + "-" * 40)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})

        try:
            login(page, username, password)

            # Get TOC via API
            print("\nFetching content structure...")
            toc = get_toc(page)

            if not toc:
                # Fallback: scrape the content page directly
                print("API unavailable. Scraping content page...")
                page.goto(f"{D2L_BASE}/d2l/le/content/{COURSE_OU}/Home", timeout=30000)
                time.sleep(3)
                # Dump page for debug
                html = page.content()
                # Find all PDF-like URLs in the page source
                pdf_urls = re.findall(r'href=["\']([^"\']*\.pdf[^"\']*)["\']', html)
                content_urls = re.findall(r'(/d2l/le/content/\d+/viewContent/\d+/View)', html)
                print(f"  Found {len(pdf_urls)} PDF links, {len(content_urls)} content links")

                SAVE_DIR.mkdir(parents=True, exist_ok=True)
                for url in pdf_urls:
                    fname = sanitize(url.split("/")[-1].split("?")[0])
                    download_file(page, url, SAVE_DIR / fname)
                browser.close()
                return

            # Parse TOC
            topics = extract_topics(toc)
            print(f"Found {len(topics)} topics across all modules.\n")

            # Save TOC for reference
            SAVE_DIR.mkdir(parents=True, exist_ok=True)
            with open(SAVE_DIR / "toc.json", "w") as f:
                json.dump(toc, f, indent=2)

            # Download PDFs and files
            downloaded = 0
            skipped = 0
            for topic in topics:
                url = topic["url"]
                title = topic["title"]
                module = topic["module_title"]

                if not url:
                    continue

                # Determine unit folder from module title
                unit_match = re.search(r'unit\s*(\d+)', module, re.IGNORECASE)
                if unit_match:
                    folder = SAVE_DIR / f"unit_{unit_match.group(1)}"
                else:
                    folder = SAVE_DIR / sanitize(module)[:50] if module else SAVE_DIR

                # Only download PDFs and documents
                is_pdf = ".pdf" in url.lower()
                is_doc = any(ext in url.lower() for ext in [".doc", ".docx", ".ppt", ".pptx"])
                is_content = "/viewContent/" in url

                if is_pdf or is_doc:
                    fname = sanitize(url.split("/")[-1].split("?")[0])
                    if not fname or fname == "_":
                        fname = sanitize(title) + ".pdf"
                    if download_file(page, url, folder / fname):
                        downloaded += 1
                    else:
                        skipped += 1
                elif is_content:
                    # Navigate to content page and look for PDF links
                    full_url = url if url.startswith("http") else f"{D2L_BASE}{url}"
                    page.goto(full_url, timeout=30000)
                    time.sleep(2)
                    html = page.content()
                    pdf_links = re.findall(r'href=["\']([^"\']*\.pdf[^"\']*)["\']', html)
                    for purl in pdf_links:
                        fname = sanitize(purl.split("/")[-1].split("?")[0])
                        if download_file(page, purl, folder / fname):
                            downloaded += 1

            print(f"\n{'=' * 40}")
            print(f"Downloaded: {downloaded} files")
            print(f"Skipped: {skipped} (already exist)")
            print(f"Saved to: {SAVE_DIR}")

        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


def get_xsrf_token(page):
    """Get XSRF token from D2L's token endpoint, falling back to cookies."""
    # Primary: D2L's dedicated XSRF token endpoint
    try:
        resp = page.request.get(f"{D2L_BASE}/d2l/lp/auth/xsrf-tokens")
        if resp.ok:
            data = resp.json()
            token = data.get("referrerToken")
            if token:
                return token
    except Exception:
        pass

    # Fallback: localStorage
    token = page.evaluate("""() => {
        try { return localStorage.getItem('XSRF.Token'); } catch(e) { return null; }
    }""")
    if token:
        return token

    # Fallback: cookies
    cookies = page.context.cookies()
    for cookie in cookies:
        if cookie["name"] in ("XSRF.Token", "d2lSecureSessionVal"):
            return cookie["value"]
    return None


def get_dropbox_folders(page):
    """Fetch all dropbox folders via D2L API. Returns (api_ver, folders) or (None, None)."""
    for ver in ["1.67", "1.50", "1.47"]:
        url = f"{D2L_BASE}/d2l/api/le/{ver}/{COURSE_OU}/dropbox/folders/"
        resp = page.request.get(url)
        if resp.ok:
            return ver, resp.json()
    return None, None


def find_dropbox_folder(folders, pattern):
    """Find a dropbox folder matching a flexible pattern.

    Supports:
    - Unit number: matches "unit 5", "u05", "u5" in folder name
    - Text pattern: matches any folder whose name contains the pattern (case-insensitive)
    - Prefers "learning guide"/"lg" matches when searching by unit number
    """
    pattern = pattern.strip()
    pattern_lower = pattern.lower()

    # Check if pattern is a unit number
    unit_match = re.match(r'^(?:unit\s*)?(\d+)$', pattern, re.IGNORECASE)
    if unit_match:
        unit_num = int(unit_match.group(1))
        # First pass: prefer learning guide folders
        for folder in folders:
            title = folder.get("Name", "").lower()
            if (f"unit {unit_num}" in title or f"u{unit_num:02d}" in title or f"u{unit_num}" in title):
                if "learning guide" in title or "lg" in title:
                    return folder
        # Second pass: any folder matching unit number
        for folder in folders:
            title = folder.get("Name", "").lower()
            if f"unit {unit_num}" in title or f"u{unit_num:02d}" in title or f"u{unit_num}" in title:
                return folder
        return None

    # Text pattern match (for "project", folder names, etc.)
    for folder in folders:
        title = folder.get("Name", "").lower()
        if pattern_lower in title:
            return folder
    return None


def submit_to_dropbox(page, file_path, folder_id, folder_name, api_ver):
    """Submit a file to a specific D2L dropbox folder. Returns True on success."""
    file_path = Path(file_path)
    filename = file_path.name
    file_bytes = file_path.read_bytes()
    print(f"  Target: {folder_name} (ID: {folder_id})")
    print(f"  File: {filename} ({len(file_bytes) // 1024}KB)")

    # Get XSRF token for API auth
    xsrf_token = get_xsrf_token(page)
    if xsrf_token:
        print(f"  XSRF token: found")
    else:
        print(f"  XSRF token: not found (will try without)")

    # --- API upload: multipart/mixed (D2L's required format) ---
    api_url = f"{D2L_BASE}/d2l/api/le/{api_ver}/{COURSE_OU}/dropbox/folders/{folder_id}/submissions/mysubmissions/"
    boundary = "xxBOUNDARYxx"

    # Build multipart/mixed body: part 1 = JSON metadata, part 2 = file
    body_parts = []
    body_parts.append(f"--{boundary}\r\n")
    body_parts.append("Content-Type: application/json\r\n\r\n")
    body_parts.append('{"Text": "", "Html": null}\r\n')
    body_parts.append(f"--{boundary}\r\n")
    body_parts.append(f'Content-Disposition: form-data; name=""; filename="{filename}"\r\n')
    body_parts.append("Content-Type: application/pdf\r\n\r\n")

    # Combine text preamble + binary file + closing boundary
    preamble = "".join(body_parts).encode("utf-8")
    epilogue = f"\r\n--{boundary}--\r\n".encode("utf-8")
    full_body = preamble + file_bytes + epilogue

    headers = {
        "Content-Type": f"multipart/mixed; boundary={boundary}",
    }
    if xsrf_token:
        headers["X-Csrf-Token"] = xsrf_token

    for attempt in range(3):
        try:
            resp = page.request.fetch(
                api_url,
                method="POST",
                headers=headers,
                data=full_body,
            )
            if resp.ok:
                print(f"  SUBMITTED (API): {filename} -> {folder_name}")
                return True
            if resp.status in (403, 500, 502, 503, 504) and attempt < 2:
                delay = 3 * (attempt + 1)
                print(f"  API returned {resp.status}, retrying in {delay}s (attempt {attempt + 1}/3)...")
                time.sleep(delay)
                continue
            print(f"  API returned {resp.status}: {resp.text()[:200]}")
            break
        except Exception as e:
            if attempt < 2:
                delay = 3 * (attempt + 1)
                print(f"  API error: {e}, retrying in {delay}s...")
                time.sleep(delay)
                continue
            print(f"  API error: {e}")
            break

    # --- Browser UI fallback with expect_file_chooser ---
    print(f"  Trying browser UI fallback...")
    submit_url = (
        f"{D2L_BASE}/d2l/lms/dropbox/user/folder_submit_files.d2l"
        f"?db={folder_id}&grpid=0&isprv=0&bp=0&ou={COURSE_OU}"
    )
    page.goto(submit_url, timeout=30000)
    page.wait_for_load_state("networkidle")

    # Screenshot for debugging on failure
    debug_dir = Path.home() / "Downloads" / "d2l-debug"
    debug_dir.mkdir(parents=True, exist_ok=True)

    # Scroll to bottom to ensure all elements are loaded
    page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    page.wait_for_timeout(1000)

    # Try to find and click "Add a File"
    add_selectors = [
        'button:has-text("Add a File")',
        'a:has-text("Add a File")',
        '[title*="Add a File"]',
        'button:has-text("Add a file")',
        'd2l-button-subtle:has-text("Add")',
    ]
    add_clicked = False
    for sel in add_selectors:
        try:
            loc = page.locator(sel).first
            if loc.count() > 0:
                loc.wait_for(state="visible", timeout=5000)
                loc.scroll_into_view_if_needed()
                loc.click(force=True)
                add_clicked = True
                break
        except Exception:
            continue

    if not add_clicked:
        page.screenshot(path=str(debug_dir / "add_file_fail.png"))
        print(f"  ERROR: Could not find 'Add a File' button. Screenshot saved.")
        return False

    # Wait for dialog/iframe to load
    page.wait_for_timeout(2000)

    # Step 1: Click "My Computer" in iframe dialog
    for frame in page.frames[1:]:
        try:
            loc = frame.locator(
                'a:has-text("My Computer"):not(.d2l-offscreen), '
                'div:has-text("My Computer"):not(.d2l-offscreen), '
                'button:has-text("My Computer")'
            ).first
            if loc.count() > 0 and loc.is_visible():
                loc.click()
                break
        except Exception as e:
            print(f"  WARN: frame selector failed: {e}")
            continue
    page.wait_for_timeout(2000)

    # Step 2: Use expect_file_chooser as primary approach
    file_set = False

    # Try file chooser first -- more reliable than hunting for input[type="file"]
    for frame in page.frames:
        try:
            upload_btn = frame.locator(
                'button:has-text("Upload"), a:has-text("Upload"), '
                'button:has-text("Browse"), input[type="button"][value*="Upload"], '
                'a:has-text("browse"), button:has-text("Choose File")'
            ).first
            if upload_btn.count() > 0 and upload_btn.is_visible():
                with page.expect_file_chooser(timeout=10000) as fc_info:
                    upload_btn.click()
                fc_info.value.set_files(str(file_path))
                file_set = True
                print(f"  File attached via file chooser")
                break
        except Exception:
            continue

    # Fallback: direct input[type="file"] across frames
    if not file_set:
        for frame in page.frames:
            try:
                fi = frame.locator('input[type="file"]')
                if fi.count() > 0:
                    fi.first.set_input_files(str(file_path))
                    file_set = True
                    print(f"  File attached via input[type=file]")
                    break
            except Exception:
                continue

    if not file_set:
        page.screenshot(path=str(debug_dir / "file_input_fail.png"))
        print(f"  ERROR: Could not attach file. Screenshot saved.")
        return False

    page.wait_for_timeout(2000)

    # Click "Add" button in dialog iframe
    for frame in page.frames:
        try:
            add_btn = frame.locator('button:has-text("Add"):not(:has-text("Add a File"))').first
            if add_btn.count() > 0 and add_btn.is_visible():
                add_btn.click(force=True)
                print(f"  Clicked 'Add' in dialog")
                break
        except Exception:
            continue
    page.wait_for_timeout(3000)

    # Click "Submit" on main page
    submit_btn = page.locator('button:has-text("Submit"), input[value="Submit"]').first
    if submit_btn.count() > 0:
        submit_btn.click(force=True)
        page.wait_for_timeout(5000)

    body_text = page.locator("body").inner_text()
    if any(w in body_text.lower() for w in ["successfully", "submitted", "receipt"]):
        print(f"  SUBMITTED (UI): {filename} -> {folder_name}")
        return True

    if "submission" in page.url.lower():
        print(f"  SUBMITTED (UI): {filename} -> {folder_name}")
        return True

    page.screenshot(path=str(debug_dir / "submit_unclear.png"))
    print(f"  WARNING: Upload status unclear. Screenshot saved. URL: {page.url}")
    return False


def submit_filled_pdfs():
    """Find and submit all filled PDFs to D2L dropbox."""
    username, password = get_creds()
    if not username or not password:
        print("ERROR: Could not read credentials from Keychain.")
        return

    filled = []
    search_paths = [
        Path.home() / "Documents" / "School" / "science",
        Path.home() / "Downloads" / "d2l-science",
    ]
    for base in search_paths:
        if not base.exists():
            continue
        for unit_dir in sorted(base.iterdir()):
            if not unit_dir.is_dir():
                continue
            for pdf in unit_dir.glob("*_FILLED.pdf"):
                unit_match = re.search(r'U(\d+)', pdf.name, re.IGNORECASE)
                if unit_match:
                    filled.append((int(unit_match.group(1)), pdf))

    if not filled:
        print("No filled PDFs found to submit.")
        return

    print(f"Found {len(filled)} filled PDFs:")
    for unit, path in filled:
        print(f"  Unit {unit}: {path}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        try:
            login(page, username, password)
            api_ver, folders = get_dropbox_folders(page)
            if not folders:
                print("ERROR: Could not fetch dropbox folders")
                return
            for unit, path in filled:
                print(f"\nSubmitting Unit {unit}...")
                target = find_dropbox_folder(folders, str(unit))
                if not target:
                    print(f"  ERROR: No dropbox folder found for unit {unit}")
                    print(f"  Available: {[f.get('Name') for f in folders]}")
                    continue
                submit_to_dropbox(page, path, target["Id"], target["Name"], api_ver)
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


def submit_file(file_path, pattern=None):
    """Submit a specific file to a D2L dropbox folder matching pattern."""
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"ERROR: File not found: {file_path}")
        return

    username, password = get_creds()
    if not username or not password:
        print("ERROR: Could not read credentials from Keychain.")
        return

    # Auto-detect pattern from filename if not provided
    if not pattern:
        name_lower = file_path.name.lower()
        unit_match = re.search(r'u(?:nit)?[\s_-]*(\d+)', name_lower)
        if unit_match:
            pattern = unit_match.group(1)
        elif "proj" in name_lower:
            pattern = "project"
        else:
            print("ERROR: Could not auto-detect dropbox folder. Provide a pattern argument.")
            print("  Usage: scrape_pdfs.py submit-file <path> [pattern]")
            return

    print(f"Submitting: {file_path.name}")
    print(f"Pattern: '{pattern}'")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        try:
            login(page, username, password)
            api_ver, folders = get_dropbox_folders(page)
            if not folders:
                print("ERROR: Could not fetch dropbox folders")
                return

            target = find_dropbox_folder(folders, pattern)
            if not target:
                print(f"ERROR: No dropbox folder matching '{pattern}'")
                print(f"Available folders:")
                for f in folders:
                    print(f"  - {f.get('Name')} (ID: {f.get('Id')})")
                return

            submit_to_dropbox(page, file_path, target["Id"], target["Name"], api_ver)
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


def list_dropboxes():
    """List all D2L dropbox folders for debugging."""
    username, password = get_creds()
    if not username or not password:
        print("ERROR: Could not read credentials from Keychain.")
        return

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1400, "height": 900})
        try:
            login(page, username, password)
            api_ver, folders = get_dropbox_folders(page)
            if not folders:
                print("ERROR: Could not fetch dropbox folders")
                return

            print(f"D2L Dropbox Folders (API {api_ver})")
            print("-" * 60)
            for f in folders:
                name = f.get("Name", "?")
                fid = f.get("Id", "?")
                due = f.get("DueDate", "no due date")
                print(f"  [{fid:>6}] {name}")
                if due and due != "no due date":
                    print(f"           Due: {due}")
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


if __name__ == "__main__":
    import sys
    args = sys.argv[1:]

    if not args:
        main()
    elif args[0] == "submit":
        submit_filled_pdfs()
    elif args[0] == "submit-file":
        if len(args) < 2:
            print("Usage: scrape_pdfs.py submit-file <path> [pattern]")
            sys.exit(1)
        fpath = args[1]
        pat = args[2] if len(args) > 2 else None
        submit_file(fpath, pat)
    elif args[0] == "list-dropboxes":
        list_dropboxes()
    else:
        print(f"Unknown command: {args[0]}")
        print("Commands: submit, submit-file <path> [pattern], list-dropboxes")
        sys.exit(1)

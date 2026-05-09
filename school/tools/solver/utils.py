import re
from html import escape

from PIL import Image, ImageSequence


def markdown_to_html(text):
    code_blocks = []

    def stash_code(match):
        code = match.group(1).rstrip("\n")
        code_blocks.append(code)
        return f"@@CODEBLOCK{len(code_blocks) - 1}@@"

    text = text.replace("\r\n", "\n").strip()
    text = re.sub(r"```(?:[^\n]*)\n(.*?)```", stash_code, text, flags=re.DOTALL)

    lines = text.split("\n")
    parts = []
    paragraph = []
    list_type = None

    def flush_paragraph():
        nonlocal paragraph
        if paragraph:
            joined = " ".join(line.strip() for line in paragraph)
            parts.append(f"<p>{format_inline(joined)}</p>")
            paragraph = []

    def close_list():
        nonlocal list_type
        if list_type:
            parts.append(f"</{list_type}>")
            list_type = None

    for raw_line in lines:
        line = raw_line.rstrip()
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            close_list()
            continue

        code_match = re.fullmatch(r"@@CODEBLOCK(\d+)@@", stripped)
        if code_match:
            flush_paragraph()
            close_list()
            code = escape(code_blocks[int(code_match.group(1))])
            parts.append(f"<pre><code>{code}</code></pre>")
            continue

        if stripped.startswith("### "):
            flush_paragraph()
            close_list()
            parts.append(f"<h3>{format_inline(stripped[4:])}</h3>")
            continue

        if stripped.startswith("## "):
            flush_paragraph()
            close_list()
            parts.append(f"<h2>{format_inline(stripped[3:])}</h2>")
            continue

        ul_match = re.match(r"^[-*]\s+(.*)$", stripped)
        if ul_match:
            flush_paragraph()
            if list_type != "ul":
                close_list()
                parts.append("<ul>")
                list_type = "ul"
            parts.append(f"<li>{format_inline(ul_match.group(1))}</li>")
            continue

        ol_match = re.match(r"^\d+\.\s+(.*)$", stripped)
        if ol_match:
            flush_paragraph()
            if list_type != "ol":
                close_list()
                parts.append("<ol>")
                list_type = "ol"
            parts.append(f"<li>{format_inline(ol_match.group(1))}</li>")
            continue

        paragraph.append(stripped)

    flush_paragraph()
    close_list()
    return "\n".join(parts) if parts else "<p>No response returned.</p>"


def format_inline(text):
    text = escape(text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", text)
    return text


def resize_image(path, max_dim=1500):
    with Image.open(path) as img:
        width, height = img.size
        longest_side = max(width, height)
        if longest_side <= max_dim:
            return

        scale = max_dim / float(longest_side)
        new_size = (max(1, round(width * scale)), max(1, round(height * scale)))
        image_format = img.format or "PNG"

        if getattr(img, "is_animated", False):
            frames = []
            for frame in ImageSequence.Iterator(img):
                resized_frame = frame.copy().convert("RGBA")
                resized_frame.thumbnail(new_size, Image.Resampling.LANCZOS)
                frames.append(resized_frame)

            if not frames:
                return

            save_kwargs = {
                "format": image_format,
                "save_all": True,
                "append_images": frames[1:],
                "loop": img.info.get("loop", 0),
                "duration": img.info.get("duration"),
            }
            if "background" in img.info:
                save_kwargs["background"] = img.info["background"]
            if "transparency" in img.info:
                save_kwargs["transparency"] = img.info["transparency"]
            frames[0].save(path, **save_kwargs)
            return

        resized = img.copy()
        resized.thumbnail(new_size, Image.Resampling.LANCZOS)
        save_kwargs = {"format": image_format}
        if image_format.upper() in {"JPEG", "JPG"} and resized.mode not in ("RGB", "L"):
            resized = resized.convert("RGB")
        resized.save(path, **save_kwargs)

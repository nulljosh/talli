import json
import os
import queue
import tempfile
import threading
import time
from functools import wraps
from html import escape

from flask import Flask, Response, jsonify, redirect, render_template, request, session, url_for

try:
    from models import PROMPT, run_claude, run_ollama
    from utils import markdown_to_html, resize_image
except ImportError:
    from .models import PROMPT, run_claude, run_ollama
    from .utils import markdown_to_html, resize_image


app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.environ.get('SOLVER_SECRET_KEY', os.urandom(24))


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        password = os.environ.get('SOLVER_PASSWORD')
        if password and not session.get('authenticated'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


def render_model_result_html(name, output=None, error=None):
    if output is not None:
        return (
            f"<div class='model-result'><div class='model-name'>{name}</div>"
            f"<div class='model-answer'>{markdown_to_html(output)}</div></div>"
        )

    return (
        f"<div class='model-result model-failed'><div class='model-name'>{name}</div>"
        f"<div class='model-answer'><p>Failed: {escape(error or 'Unknown error')}</p></div></div>"
    )


def sse_event(event_name, payload):
    return f"event: {event_name}\ndata: {json.dumps(payload)}\n\n"


def cleanup_temp_file(temp_path, threads):
    for thread in threads:
        thread.join()
    if temp_path and os.path.exists(temp_path):
        os.remove(temp_path)


@app.get("/")
@require_auth
def index():
    return render_template("index.html")


@app.post("/solve")
@require_auth
def solve():
    uploaded = request.files.get("image")
    if not uploaded or not uploaded.filename:
        return jsonify({"error": "No image uploaded."}), 400

    suffix = os.path.splitext(uploaded.filename)[1] or ".png"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            uploaded.save(temp_file)
            temp_path = temp_file.name

        resize_image(temp_path)

        results_queue = queue.Queue()
        threads = [
            threading.Thread(
                target=run_claude,
                args=("opus", "Claude Opus", "opus", temp_path, PROMPT, results_queue),
                daemon=True,
            ),
            threading.Thread(
                target=run_claude,
                args=("sonnet", "Claude Sonnet", "sonnet", temp_path, PROMPT, results_queue),
                daemon=True,
            ),
            threading.Thread(
                target=run_ollama,
                args=(temp_path, PROMPT, results_queue),
                daemon=True,
            ),
        ]

        def generate():
            start_time = time.monotonic()
            received_keys = set()

            try:
                for thread in threads:
                    thread.start()

                while len(received_keys) < len(threads):
                    remaining = 120 - (time.monotonic() - start_time)
                    if remaining <= 0:
                        break

                    try:
                        model_result = results_queue.get(timeout=remaining)
                    except queue.Empty:
                        break

                    key = model_result["key"]
                    if key in received_keys:
                        continue

                    received_keys.add(key)
                    html = render_model_result_html(
                        model_result["name"],
                        output=model_result.get("output"),
                        error=model_result.get("error"),
                    )
                    yield sse_event(
                        "result",
                        {"key": key, "name": model_result["name"], "html": html},
                    )

                yield sse_event("done", {"status": "complete"})
            except Exception as error:
                yield sse_event("error", {"error": str(error)})
            finally:
                cleanup_thread = threading.Thread(
                    target=cleanup_temp_file,
                    args=(temp_path, threads),
                    daemon=True,
                )
                cleanup_thread.start()

        return Response(
            generate(),
            content_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as error:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        return jsonify({"error": str(error)}), 500


@app.get('/login')
def login():
    return render_template('login.html')


@app.post('/login')
def login_post():
    if request.form.get('password') == os.environ.get('SOLVER_PASSWORD'):
        session['authenticated'] = True
        return redirect(url_for('index'))
    return render_template('login.html', error='Wrong password')


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5050, debug=False)

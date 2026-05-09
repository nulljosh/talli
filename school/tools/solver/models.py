import base64
import json
import os
import subprocess


PROMPT = (
    "Look at this image. What is the problem shown? Give the answer first, then "
    "a clear explanation. Be concise but thorough. Explain like the reader is "
    "smart but unfamiliar with this specific topic."
)


def run_claude(model_key, model_name, cli_model, temp_path, prompt, results_queue):
    clean_env = {
        key: value
        for key, value in os.environ.items()
        if key not in ("CLAUDECODE", "ANTHROPIC_API_KEY")
    }

    try:
        full_prompt = f"Read the image at {temp_path} using the Read tool. {prompt}"
        proc = subprocess.run(
            ["claude", "--print", "--model", cli_model, "-p", full_prompt, "--allowedTools", "Read"],
            capture_output=True,
            text=True,
            check=False,
            env=clean_env,
            timeout=120,
        )
        if proc.returncode == 0:
            results_queue.put(
                {"key": model_key, "name": model_name, "output": proc.stdout.strip()}
            )
            return

        error = proc.stderr.strip() or proc.stdout.strip() or "Command failed"
        results_queue.put({"key": model_key, "name": model_name, "error": error})
    except Exception as error:
        results_queue.put({"key": model_key, "name": model_name, "error": str(error)})


def run_ollama(temp_path, prompt, results_queue):
    try:
        with open(temp_path, "rb") as img_file:
            img_b64 = base64.b64encode(img_file.read()).decode()
        payload = json.dumps(
            {
                "model": "llava",
                "prompt": prompt,
                "images": [img_b64],
                "stream": False,
            }
        )
        proc = subprocess.run(
            ["curl", "-s", "http://localhost:11434/api/generate", "-d", payload],
            capture_output=True,
            text=True,
            check=False,
            timeout=30,
        )
        if proc.returncode == 0:
            resp = json.loads(proc.stdout)
            output = resp.get("response", "").strip()
            if output:
                results_queue.put(
                    {"key": "ollama", "name": "Ollama llava (local)", "output": output}
                )
                return
            results_queue.put(
                {"key": "ollama", "name": "Ollama llava (local)", "error": "Empty response"}
            )
            return

        results_queue.put(
            {"key": "ollama", "name": "Ollama llava (local)", "error": "Ollama not running"}
        )
    except Exception as error:
        results_queue.put({"key": "ollama", "name": "Ollama llava (local)", "error": str(error)})

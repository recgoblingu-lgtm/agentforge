"""Pythonista local Llama chat agent.

One-time setup:
  1. Install a Pythonista-compatible build of llama_cpp, if available to your setup.
     Pythonista cannot always compile native packages itself. If `import llama_cpp`
     fails, install a prebuilt Pythonista/StaSh wheel or use a-Shell/llama.cpp.
  2. Run this script while online once. It downloads a quantized GGUF model.
  3. After the model finishes downloading, run it again in Airplane Mode.

This script does not use an API key or an inference service. The model download
is only a one-time asset download; inference happens locally on the iPhone.
"""

from __future__ import print_function
import json
import os
import sys
import time
import urllib.request

MODEL_URL = (
    "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/"
    "Llama-3.2-1B-Instruct-Q4_K_M.gguf?download=true"
)
MODEL_NAME = "Llama-3.2-1B-Instruct-Q4_K_M.gguf"
MODEL_DIR = os.path.join(os.path.expanduser("~/Documents"), "LocalLlama")
MODEL_PATH = os.path.join(MODEL_DIR, MODEL_NAME)
HISTORY_PATH = os.path.join(MODEL_DIR, "chat_history.json")

SYSTEM_PROMPT = (
    "You are a helpful private local AI assistant running on an iPhone in Pythonista. "
    "Answer directly, explain your reasoning when useful, and write complete runnable "
    "code when asked. Do not claim to browse the web or call an external service."
)


def format_bytes(value):
    value = float(value)
    for unit in ("B", "KB", "MB", "GB"):
        if value < 1024 or unit == "GB":
            return "%.1f %s" % (value, unit)
        value /= 1024


def download_model():
    if os.path.exists(MODEL_PATH):
        size = os.path.getsize(MODEL_PATH)
        if size > 100 * 1024 * 1024:
            print("Using cached model: %s" % format_bytes(size))
            return
        print("Cached model looks incomplete; downloading again.")
        os.remove(MODEL_PATH)

    if not os.path.isdir(MODEL_DIR):
        os.makedirs(MODEL_DIR)

    print("Downloading the local Llama model.")
    print("This is a one-time download of roughly 800 MB.")
    print("Keep Pythonista open and connected to Wi-Fi until it finishes.")

    temporary_path = MODEL_PATH + ".part"
    request = urllib.request.Request(MODEL_URL, headers={"User-Agent": "Pythonista-LocalLlama/1.0"})
    started = time.time()
    with urllib.request.urlopen(request, timeout=60) as response:
        total = int(response.headers.get("Content-Length", "0"))
        received = 0
        with open(temporary_path, "wb") as output:
            while True:
                chunk = response.read(1024 * 1024)
                if not chunk:
                    break
                output.write(chunk)
                received += len(chunk)
                elapsed = max(time.time() - started, 0.1)
                speed = received / elapsed
                if total:
                    percent = received * 100.0 / total
                    print("\r%.1f%%  %s / %s  %.1f MB/s" % (
                        percent, format_bytes(received), format_bytes(total), speed / 1024 / 1024
                    ), end="")
                else:
                    print("\r%s downloaded" % format_bytes(received), end="")
                sys.stdout.flush()
    os.replace(temporary_path, MODEL_PATH)
    print("\nModel saved to %s" % MODEL_PATH)


def load_history():
    try:
        with open(HISTORY_PATH, "r") as source:
            value = json.load(source)
        if isinstance(value, list):
            return value
    except Exception:
        pass
    return [{"role": "system", "content": SYSTEM_PROMPT}]


def save_history(messages):
    with open(HISTORY_PATH, "w") as target:
        json.dump(messages, target, indent=2)


def load_llama():
    try:
        from llama_cpp import Llama
    except ImportError:
        print("\nPythonista does not currently have llama_cpp installed.")
        print("The model file is ready, but a native llama.cpp Python binding is required to run it.")
        print("Install a Pythonista-compatible prebuilt llama_cpp wheel/runtime, then run this script again.")
        print("Do not install the regular desktop package blindly; iOS needs an iOS-compatible build.")
        raise

    print("Loading Llama locally. The first load can take a minute.")
    return Llama(
        model_path=MODEL_PATH,
        n_ctx=2048,
        n_threads=4,
        n_batch=128,
        n_gpu_layers=0,
        verbose=False,
    )


def ask(model, messages):
    result = model.create_chat_completion(
        messages=messages[-12:],
        max_tokens=384,
        temperature=0.6,
        top_p=0.9,
        stream=False,
    )
    return result["choices"][0]["message"]["content"].strip()


def main():
    print("Local Llama for Pythonista — no API key, no account, no inference service")
    if not os.path.exists(MODEL_PATH):
        download_model()
    else:
        download_model()

    model = load_llama()
    messages = load_history()
    print("\nReady. Type /reset to clear chat, /save to save, or /quit to exit.\n")

    while True:
        try:
            prompt = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye.")
            break
        if not prompt:
            continue
        if prompt.lower() in ("/quit", "/exit"):
            break
        if prompt.lower() == "/reset":
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]
            save_history(messages)
            print("Conversation cleared.")
            continue
        if prompt.lower() == "/save":
            save_history(messages)
            print("Saved locally to %s" % HISTORY_PATH)
            continue

        messages.append({"role": "user", "content": prompt})
        try:
            answer = ask(model, messages)
        except Exception as error:
            messages.pop()
            print("Local generation failed: %s" % error)
            print("Try /reset, lowering n_ctx, or closing other apps to free memory.")
            continue
        messages.append({"role": "assistant", "content": answer})
        save_history(messages)
        print("\nLlama: %s\n" % answer)


if __name__ == "__main__":
    main()

# AgentForge

**AgentForge is a static, browser-local AI companion workspace.** It is designed to be built and hosted on GitHub Pages with no server runtime, API key, authentication service, database, or cloud storage.

## What runs locally

The application is a Vite and React single-page application. It can load a small quantized Llama 3.2 Instruct model through WebLLM and run chat completions locally with WebGPU. The first model setup downloads model assets and caches them in the browser; after that, prompts and responses are processed on the device rather than sent to an inference API. A deterministic local fallback is retained for browsers or devices that cannot run WebGPU.

| Capability | Implementation | External dependency |
|---|---|---|
| Companion profile creation | Deterministic browser-side rules | None |
| Chat responses | WebLLM model ladder: Llama 3.2 3B first, then Llama 3.2 1B, then TinyLlama | First-run model download and browser cache; no inference API |
| Fast response behavior | Immediate deterministic response while the local model warms up | None |
| Unsupported-device behavior | Deterministic browser-side fallback | None |
| Notes, memories, chats, settings | `localStorage` | None |
| Backups | JSON download/upload in the browser | None |
| Voice input and read-aloud | Browser Web Speech capabilities, where available | None |
| Calculator and Code Lab | Browser-side code | None |
| Hosting | GitHub Pages static files | GitHub Pages only |

> **Important limitation:** The first local-model setup downloads roughly a gigabyte of quantized model assets and requires a browser with WebGPU. On iPhone/Safari versions or devices where WebGPU is unavailable or memory-constrained, AgentForge automatically uses its deterministic local fallback instead. The model runs on the device after download; prompts are not sent to an inference API.

The local runtime uses [WebLLM](https://webllm.mlc.ai/docs/), which exposes OpenAI-style chat completions over WebGPU. It tries the smarter Llama 3.2 3B model first, then automatically falls back to a faster 1B model and TinyLlama if memory or device limits prevent the larger model from loading. WebLLM documents asynchronous first-run model loading and browser caching; Apple documents WebGPU support on iPhone, iPad, Mac, and Vision Pro. Performance and availability still depend on the specific iPhone, iOS version, Safari/WebKit build, available memory, and whether the model assets are allowed to remain cached.

## Run locally

```bash
pnpm install
pnpm dev
```

Build the production site with:

```bash
pnpm build
pnpm preview
```

Validation commands:

```bash
pnpm check
pnpm test
pnpm build
```

## GitHub Pages deployment

The repository includes `.github/workflows/pages.yml`. On every push to `main`, it installs the locked dependencies, runs the static build, creates SPA fallbacks, and deploys `dist/public` to GitHub Pages.

In the GitHub repository, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions** once. The Vite configuration derives the base path from `GITHUB_REPOSITORY`, so the same build works locally and at `https://<owner>.github.io/<repository>/`.

## Data portability and privacy

Browser storage is specific to a browser profile and can be cleared by the visitor. Use **Backups** to download a portable JSON file before clearing site data or moving to another device. Backups are only created when the visitor chooses to download them; no background data transfer occurs.

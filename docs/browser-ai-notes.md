# Browser-local AI research notes

- WebLLM official documentation: https://webllm.mlc.ai/docs/ — describes high-performance in-browser LLM inference with WebGPU, OpenAI-compatible chat APIs, browser workers, and multiple model support.
- WebLLM basic usage: https://webllm.mlc.ai/docs/user/basic_usage.html — CreateMLCEngine loads models asynchronously; first load downloads model assets and can take significant time; chat completions support streaming.
- WebLLM model records: https://raw.githubusercontent.com/mlc-ai/web-llm/main/src/config.ts — current records include Llama-3.2-3B-Instruct-q4f16_1-MLC (~2.3 GB VRAM estimate), Llama-3.2-1B-Instruct-q4f16_1-MLC (~0.9 GB), and TinyLlama-1.1B-Chat-v0.4-q4f32_1-MLC (~0.8 GB).
- Transformers.js documentation: https://huggingface.co/docs/transformers.js/en/index — browser inference via ONNX Runtime, with WASM CPU fallback and optional WebGPU; quantization is recommended for resource-constrained browsers.
- Apple WWDC25 WebGPU: https://developer.apple.com/videos/play/wwdc2025/236/ — Apple documents WebGPU for general-purpose GPU compute and says it is supported on Mac, iPhone, iPad, and Vision Pro; actual model performance depends on device and browser resources.
- Architectural conclusion: a true no-API local LLM still needs model assets either downloaded at runtime or bundled into the site. A bundled model would make the repository/site extremely large; runtime download plus browser cache is the practical free option.

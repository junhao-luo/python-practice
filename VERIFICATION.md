# Verification

- The 30 fixed reference solutions passed all **144** cases in the actual sandboxed browser Pyodide runner.
- Browser runner checks passed for infinite-loop timeout, excessive output, runtime errors, unexpected end of input, and while-only restrictions.
- The main editor successfully ran checks and updated completion progress.
- **11 automated checks** pass for fixed routes/catalog; same-origin, consent, input and key validation; canonical problem/error context; key handling; deterministic grade calculation; provider failures; missing evidence; Gemini/Groq/OpenRouter/OpenAI adapters; invalid provider/model rejection; public owner-key isolation; subpath routing; and the Vercel adapter.
- Provider responses in automated checks are simulated. Live responses depend on the visitor's valid API key, model access, quota and network.
- JavaScript syntax and the deployment build pass. No third-party npm dependencies are installed.
- Browser execution and AI grades are for learning, not tamper-resistant examinations.

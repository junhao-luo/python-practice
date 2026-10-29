# Python Practice Lab

A browser-based Python practice workspace with 30 fixed exercises, exact-output tests, progressive hints, and optional AI feedback. English prompts retain useful Mandarin keywords.

Target website: **https://eljhon.me/python-practice**

## Practice

- Word problem on the left, editor at the top right, terminal below.
- Python 3.12 runs through pinned Pyodide 0.27.7 in a worker inside a sandboxed, opaque-origin iframe. Submitted code does not execute on the web server or access the app's stored drafts and provider keys. The runner's network policy permits only its runtime CDN.
- Run with custom input or check all cases. Spaces, punctuation, blank lines, and final newlines must match; CRLF is normalized to LF. Exercise-specific loop restrictions are checked.
- Progressive hints, reference solutions, browser-local draft/completion saving, export/import.
- Ctrl+Enter runs; Ctrl+Shift+Enter checks. Tab indents by four spaces, Shift+Tab removes indentation, and Enter continues indentation.

The first run downloads the Python runtime. Each Run/Check starts a fresh worker, with a 90-second startup limit, 2.5-second limit per case, and 128 Ki-character cap per output stream. Browser caching reduces subsequent downloads. Extremely large memory allocations may still exhaust the browser; this is a self-study runner, not a secure examination system.

## AI providers

Open **AI settings**, select a provider, choose a model, enter your own key, and read/enable the consent checkbox.

| Provider | Default model | Account / keys |
| --- | --- | --- |
| OpenRouter | `openrouter/free` | https://openrouter.ai/keys |
| Groq | `openai/gpt-oss-20b` | https://console.groq.com/keys |
| Google Gemini | `gemini-2.5-flash-lite` | https://aistudio.google.com/apikey |
| OpenAI | `gpt-4.1-mini` | https://platform.openai.com/api-keys |

Model names are editable. OpenRouter's free router, Groq's free plan, and Gemini's free tier have account-specific quotas and availability. Other models may incur charges. OpenAI API use is generally billed separately from ChatGPT. The app never switches providers/models automatically. A selected model must support JSON output.

Your key is held only in the tab's memory and sent over HTTPS through the app to the selected provider's fixed API endpoint. It is not saved in browser storage, progress exports, source, or application logs. Reloading or switching providers clears the key. Code, the selected fixed exercise/reference solution, and relevant run/test results are sent only when you request AI with consent. Provider privacy policies apply; do not submit private information. Google may use free-tier data to improve its products.

**Review / explain error** provides concrete explanations and suggested edits. Suggested code is shown before you explicitly choose to replace your draft. Check the suggestion afterwards.

**Grade with AI** runs the tests first, then calculates **60 output points** from exact test results, **25 approach points**, and **15 readability points** from AI. AI cannot override failed tests or mark an exercise complete. The grade is a learning estimate: tests and execution evidence are available in the browser and are not tamper-resistant.

The public deployment requires each visitor's own API key. It does not expose a shared owner key. If AI is disconnected or quota-limited, code execution and deterministic checks still work.

## Development

Node.js 22+; no npm packages are required.

```text
node scripts/build.mjs
node --test tests/api.test.mjs tests/vercel.test.mjs
node scripts/preview.mjs
```

Open http://127.0.0.1:8766/python-practice/. On Windows you can also double-click `Start Online Preview.cmd`.

The local-only `/selftest` page runs every reference program through actual browser Python. `/qa-catalog` is available only in the local preview. Neither route is deployed.

## Hosting

Vercel builds the embedded application into `dist/server/index.js`. `api/index.mjs` adapts it to Vercel's Node request/response API. `vercel.json` serves the application under `/python-practice/` and redirects the separate deployment's root there.

The portfolio repository routes `/python-practice` and its descendants to this independent deployment. Existing portfolio and student-dashboard routes remain independent. Keep the actual Vercel deployment origin in the portfolio rewrites synchronized if the project domain changes.

All production AI calls use visitor-provided keys; do not configure a shared paid key for anonymous usage. The API validates same-origin requests, input limits, provider/model choices and structured responses. Provider URLs are fixed, application errors redact provider bodies, and throttling is best-effort per server instance. Public traffic may need durable per-user limits and account controls later.

Progress stays in the visitor's browser and is not synced between devices. Export a backup before clearing site storage.

## Future lecture imports

The 30 exercises remain fixed. Upload/generation is not implemented yet. Each record separates `id`, `title`, `lesson`, `description`, `hints`, `rule`, `tests`, and `solution`, allowing a later pipeline to extract PowerPoint/PDF/notes, generate candidates, validate solutions/outputs, and present them for review before saving into personal collections. Uploaded lectures must be treated as data, not AI instructions. Personal collections will require authenticated storage, upload limits, quotas, and source attribution.

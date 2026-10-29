# Python Practice Lab

A browser-based Python practice workspace with 30 fixed exercises, exact-output tests, progressive hints, and optional AI feedback. English prompts retain useful Mandarin keywords.

Target website: **https://eljhon.me/python-practice**

## Practice

- Word problem on the left, editor at the top right, terminal below.
- Python 3.12 runs through pinned Pyodide 0.27.7 in a worker inside a sandboxed, opaque-origin iframe. Submitted code does not execute on the web server or access the app's stored drafts and provider keys. The runner's network policy permits only its runtime CDN.
- Run with custom input or check all cases. Spaces, punctuation, blank lines, and final newlines must match; CRLF is normalized to LF. Exercise-specific loop restrictions are checked.
- Progressive hints, reference solutions, Clerk account completion/hint sync, per-device drafts, export/import.
- Ctrl+Enter runs; Ctrl+Shift+Enter checks. Tab indents by four spaces, Shift+Tab removes indentation, and Enter continues indentation.

The first run downloads the Python runtime. Each Run/Check starts a fresh worker, with a 90-second startup limit, 2.5-second limit per case, and 128 Ki-character cap per output stream. Browser caching reduces subsequent downloads. Extremely large memory allocations may still exhaust the browser; this is a self-study runner, not a secure examination system.

## AI providers

Open **Account & AI**, select a provider, choose a model, enter your own key, and read/enable the consent checkbox.

| Provider | Default model | Account / keys |
| --- | --- | --- |
| OpenRouter | `openrouter/free` | https://openrouter.ai/keys |
| Groq | `openai/gpt-oss-20b` | https://console.groq.com/keys |
| Google Gemini | `gemini-2.5-flash-lite` | https://aistudio.google.com/apikey |
| OpenAI | `gpt-4.1-mini` | https://platform.openai.com/api-keys |

Model names are editable. OpenRouter's free router, Groq's free plan, and Gemini's free tier have account-specific quotas and availability. Other models may incur charges. OpenAI API use is generally billed separately from ChatGPT. The app never switches providers/models automatically. A selected model must support JSON output.

Sign in with Clerk to sync completed exercises, revealed hints, and the selected exercise across devices. Code drafts and custom inputs stay on each device, isolated by account. Guest work is imported only when you choose **Import guest work**. Export a backup before clearing browser storage. Sync is for self-study; completion claims are not examination records.

In **Account & AI**, enter a provider key and optionally choose **Save to account**. Saved connections use AES-256-GCM encryption on the server, with a private encryption key held in Vercel and ciphertext in your Clerk private metadata. The browser receives only the provider/model and whether a key is saved. Without that option, the key stays in the current tab's memory. Keys are excluded from progress exports, source, prompts and application logs. Removing a saved connection removes the app's copy; revoke the key at its provider if necessary.

After you enable sharing consent, **Check answer** runs exact tests and automatically requests an AI grade and feedback. The server computes **60 output points**; AI supplies up to **25 approach points** and **15 readability points**. AI cannot override exact-test completion. Without a configured connection or consent, exact checks still run and show their output points. Grades are learning estimates based on browser execution evidence and are not tamper-resistant.

**AI Tutor** explains the latest error and answers questions through chat. It does not grade or replace your program. Small illustrative snippets may be included. Changing accounts clears the active AI connection, consent and chat; reconnect/allow sharing for the current account.

Requests use compact JSON, preserve Python indentation and strings, summarize tests, include at most two failed-case examples, and retain a short chat history. Passing output and full reference solutions are omitted from model prompts. Matching requests can reuse feedback for ten minutes in a warm server instance. Output budgets and best-effort rate limits reduce usage. Code and relevant execution evidence are sent only on Check/explain/chat after consent. Provider privacy policies apply; avoid private information. Google may use free-tier data to improve its products.

Prompt-injection defenses separate server instructions from untrusted code/chat/test output, add a private server policy, enforce structured responses and score limits, and render replies as text. Credentials never enter model prompts. These layers reduce risk; a hidden prompt cannot guarantee that a model always follows instructions.

The public deployment requires each visitor's own API key. It does not expose a shared owner key. If AI is disconnected or quota-limited, code execution and deterministic checks still work.

## Development

Node.js 22+; install the pinned Clerk backend dependency with `npm ci`.

```text
npm ci
node scripts/build.mjs
node scripts/preview.mjs
```

Open http://127.0.0.1:8766/python-practice/. On Windows you can also double-click `Start Online Preview.cmd`.

The local-only `/selftest` page runs every reference program through actual browser Python. `/qa-catalog` is available only in the local preview. Neither route is deployed.

## Hosting

Vercel builds the embedded application into `dist/server/index.js`. `api/index.mjs` adapts it to Vercel's Node request/response API. `vercel.json` serves the application under `/python-practice/` and redirects the separate deployment's root there.

The portfolio repository routes `/python-practice` and its descendants to this independent deployment. Existing portfolio and student-dashboard routes remain independent. Keep the actual Vercel deployment origin in the portfolio rewrites synchronized if the project domain changes.

All production AI calls use visitor-provided keys; do not configure a shared paid key for anonymous usage. The API validates same-origin requests, input limits, provider/model choices and structured responses. Provider URLs are fixed, application errors redact provider bodies, and throttling is best-effort per server instance. Public traffic may need durable per-user limits and account controls later.

Account endpoints verify Clerk session tokens and use the authenticated user ID exclusively. Progress and encrypted connections occupy separate app-specific private metadata fields; other applications' metadata is preserved. The Node/Vercel adapter provides account storage; the basic local preview remains suitable for guest practice.

## Future lecture imports

The 30 exercises remain fixed. Upload/generation is not implemented yet. Each record separates `id`, `title`, `lesson`, `description`, `hints`, `rule`, `tests`, and `solution`, allowing a later pipeline to extract PowerPoint/PDF/notes, generate candidates, validate solutions/outputs, and present them for review before saving into personal collections. Uploaded lectures must be treated as data, not AI instructions. Personal collections will require authenticated storage, upload limits, quotas, and source attribution.

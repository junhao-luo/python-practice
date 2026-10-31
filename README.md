# Python Practice Lab

A browser-based Python practice workspace with 111 fixed exercises across two courses, exact-output tests, progressive hints, and optional AI feedback. English prompts retain useful Mandarin keywords.

Target website: **https://eljhon.me/python-practice**

## Practice

- Word problem on the left, editor at the top right, terminal below.
- Python 3.12 runs through pinned Pyodide 0.27.7 in a worker inside a sandboxed, opaque-origin iframe. Submitted code does not execute on the web server or access the app's stored drafts and provider keys. The runner's network policy permits only its runtime CDN.
- Run with custom input or check all cases. Spaces, punctuation, blank lines, and final newlines must match; CRLF is normalized to LF. Exercise-specific loop restrictions are checked.
- Progressive hints, reference solutions, Clerk account completion/hint sync, per-device drafts, export/import.
- Ctrl+Enter runs; Ctrl+Shift+Enter checks. Tab indents by four spaces, Shift+Tab removes indentation, and Enter continues indentation.

The first run downloads the Python runtime. Each Run/Check starts a fresh worker, with a 90-second startup limit, a 2.5-second limit per programming case or 10 seconds per AI Mathematics case, and 128 Ki-character cap per output stream. Browser caching reduces subsequent downloads. Extremely large memory allocations may still exhaust the browser; this is a self-study runner, not a secure examination system.

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

The historical local-only `/selftest` page runs the Basic Programming reference programs through actual browser Python. `/qa-catalog` is available only in the local preview. Neither route is deployed.

## Hosting

Vercel builds the embedded application into `dist/server/index.js`. `api/index.mjs` adapts it to Vercel's Node request/response API. `vercel.json` serves the application under `/python-practice/` and redirects the separate deployment's root there.

The portfolio repository routes `/python-practice` and its descendants to this independent deployment. Existing portfolio and student-dashboard routes remain independent. Keep the actual Vercel deployment origin in the portfolio rewrites synchronized if the project domain changes.

All production AI calls use visitor-provided keys; do not configure a shared paid key for anonymous usage. The API validates same-origin requests, input limits, provider/model choices and structured responses. Provider URLs are fixed, application errors redact provider bodies, and throttling is best-effort per server instance. Public traffic may need durable per-user limits and account controls later.

Account endpoints verify Clerk session tokens and use the authenticated user ID exclusively. Progress and encrypted connections occupy separate app-specific private metadata fields; other applications' metadata is preserved. The Node/Vercel adapter provides account storage; the basic local preview remains suitable for guest practice.

## Future lecture imports

The 111 exercises remain fixed. Upload/generation is not implemented yet. Each record separates `id`, `title`, `lesson`, `description`, `hints`, `rule`, `tests`, and `solution`, allowing a later pipeline to extract PowerPoint/PDF/notes, generate candidates, validate solutions/outputs, and present them for review before saving into personal collections. Uploaded lectures must be treated as data, not AI instructions. Personal collections will require authenticated storage, upload limits, quotas, and source attribution.

## Courses and graph output

The Course selector loads only that course's exercises and shows its completion count. Basic Programming I keeps its original 30 IDs and existing drafts/progress. AI Fundamental Mathematics I adds 81 exercises through lecture 10: probability, conversions, visualization, math/SymPy, functions, linear systems, distances, inequalities, quadratics and least squares. Both courses share the account's encrypted AI connection while retaining separate exercise records. Exports include both courses.

The mathematics catalog uses the available unlocked course materials and saved translations. Tasks based on figure-only instructions have explicit adapted chart specifications; they are labeled accordingly. Some mixed numeric/graph tasks are identified as numerical parts. The reference documents are not uploaded or bundled into the public repository. See `MATH_SOURCES.md` for the source mapping.

NumPy, SymPy, Matplotlib and SciPy are supported in the isolated browser runner. Required packages download from the pinned Pyodide CDN on demand. Matplotlib uses the Agg backend; figures appear as PNG images in the terminal after Run and in individual Check results. Up to four final figures are shown per case. `show()` is nonblocking; figures explicitly closed by the program are not retained. Large or slow figures may hit the execution limit. The first scientific-package download can take longer than a basic run.

Chart exercises check numerical data, chart labels/styles, scatter properties, fills or subplot requirements as specified by each prompt. This is not pixel matching. The AI receives textual chart-check feedback rather than large image payloads. Numeric exercises retain exact text-output matching. All checks run in the browser and remain suitable for learning rather than examinations.

## Resizable panels

On desktop/tablet widths, drag the boundaries between the problem and coding panels, editor and terminal, or terminal input and output. Sizes are remembered on this device. Double-click a divider to reset it. Keyboard users can focus a divider and use arrow keys (Shift for larger steps), Home or End. On narrow mobile screens the panels retain their stacked layout.

## Landing page and required sign-in

`/python-practice` is the public landing page. `/python-practice/lab` requires a verified Clerk session. Problem, course, reference-solution, exercise-check and AI endpoints also verify the session on the server. The lab initializes only after Clerk confirms sign-in. Existing account progress, encrypted connections and local drafts use their existing keys. Signing out returns to the landing page.

Clerk component localization names the sign-in/sign-up experience Python Practice Lab. The shared Clerk application's global name, users, domain and provider consent configuration are not renamed. Google/GitHub authorization screens remain controlled by their existing provider/application settings.

## Reviewer-aligned mathematics and exam focus

The 81 mathematics exercises now follow `AI_Mathematics_Lessons_1-10_Synthesized_Reviewer.md` and its worked examples. Fifteen changed specifications use new revision IDs; unchanged exercises retain their IDs and progress. Earlier drafts remain in browser storage and exports, but retired specifications no longer earn completion for revised tasks.

The Exam Focus selector filters all tagged practice, or Q1 through Q6 individually. Star badges mean the exercise trains a skill in the supplied six-topic briefing, not that its sample data are the actual exam questions. Six dedicated preparation programs follow the supplied sample outputs. Q1 is explicitly inferred from a drawing. Q6's feature-sum/distance axes are provisional. The briefing's point weights are 14,12,14,14,20,26; Q5–6 together account for 46 points.

The non-programming thesis-search/screenshot assignment remains a research activity in the reviewer; this lab does not pretend to automatically grade it. The dedicated KNN tasks retain Mandarin output and labels. A pinned open-source Noto Sans CJK TC font downloads from the same permitted runtime CDN when plotting code contains CJK text. The font's source is notofonts/noto-cjk, Sans2.004, distributed under the SIL Open Font License.

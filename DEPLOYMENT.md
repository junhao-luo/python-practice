# Production deployment

- Website: https://eljhon.me/python-practice
- Source: https://github.com/junhao-luo/python-practice
- Vercel project: https://vercel.com/junhao-luos-projects/python-practice
- Independent production origin: https://python-practice-chi.vercel.app
- Portfolio routing: `junhao-luo/junhao-luo`, `vercel.json`.

The portfolio forwards `/python-practice`, `/python-practice/`, and all descendants to this independent deployment. The existing student-dashboard routes are retained. No DNS changes were needed.

The practice project deploys automatically from its `main` branch through the approved Vercel GitHub connection. The public deployment requires visitors to connect their own Gemini, Groq, OpenRouter, or OpenAI key; no shared key is configured. Free-tier quotas and paid-model charges belong to each provider account.

If the independent production domain changes, update the three Python practice rewrites in the portfolio repository to that new domain. Do not replace the portfolio's root deployment or its existing app routes.


## Private environment

Configure Production variables in this Vercel project before deploying:

- `CLERK_PUBLISHABLE_KEY`: the production Clerk frontend key for `clerk.eljhon.me`.
- `CLERK_SECRET_KEY`: private Clerk backend key; never commit it.
- `AI_KEY_ENCRYPTION_KEY`: private, base64-encoded 32 random bytes for AES-256-GCM. Keep it stable; replacing it makes existing saved connections unreadable.
- `AI_GUARD_POLICY`: additional private AI instruction policy. Never put credentials into this policy.

Clerk reuses the existing production sign-in application registered to `eljhon.me`. Python Practice stores completion/hint flags under `privateMetadata.pythonPractice` and encrypted provider connections under `privateMetadata.pythonPracticeConnections`. Do not add these to session claims or public metadata. Keep Clerk's combined metadata size limit in mind; code drafts are not uploaded.

Sign in through `eljhon.me/python-practice`. Production Clerk domain restrictions may prevent signing in through independent Vercel preview domains. Environment changes require a new deployment. No shared AI-provider key is configured: each visitor connects their own provider.

The public entry is now the landing page. The authenticated lab is `/python-practice/lab`; the existing wildcard portfolio rewrite already forwards this path. No Clerk credential or global application-name changes are required.

# Production deployment

- Website: https://eljhon.me/python-practice
- Source: https://github.com/junhao-luo/python-practice
- Vercel project: https://vercel.com/junhao-luos-projects/python-practice
- Independent production origin: https://python-practice-chi.vercel.app
- Portfolio routing: `junhao-luo/junhao-luo`, `vercel.json`.

The portfolio forwards `/python-practice`, `/python-practice/`, and all descendants to this independent deployment. The existing student-dashboard routes are retained. No DNS changes were needed.

The practice project deploys automatically from its `main` branch through the approved Vercel GitHub connection. The public deployment requires visitors to connect their own Gemini, Groq, OpenRouter, or OpenAI key; no shared key is configured. Free-tier quotas and paid-model charges belong to each provider account.

If the independent production domain changes, update the three Python practice rewrites in the portfolio repository to that new domain. Do not replace the portfolio's root deployment or its existing app routes.


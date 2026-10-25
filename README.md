# Ready Candidate

A dashboard-first career workspace with Resume Studio, LinkedIn Studio,
Cover Letters, a tutorial library, and accounts/plans.

Resume Studio retains the original editor, nine templates, live preview,
PDF printing, import, ATS reports and AI optimization. Signed-in users can
save multiple resumes and writing drafts to their own account.

Administrators manage dashboard content, YouTube tutorials, account limits,
AI availability, Pro pricing, offers/promos, users and transactions in Django.
Career Path, interviews and job/application tracking are excluded.

Frontend: React 19, Vite and CSS. Backend: Django and Django REST Framework.
All 50 resume template models are available in Basic (₹199) and Pro (₹499).
Unpaid visitors can preview the models. Pro also unlocks LinkedIn Studio,
cover letters and AI services. Both prices are one-time purchases controlled
in Django admin. Learning videos, written lessons and resource links are
published through admin as well.
AI: an OpenAI-compatible provider configured on the server. Payments: Razorpay
with signature verification, captured-payment checks and signed webhooks.

Read [HOSTING.md](HOSTING.md) for local startup, administration, credentials,
database migration and Vercel deployment instructions.

```sh
npm ci
npm run dev
# In another terminal:
python server/manage.py migrate
python server/manage.py runserver 127.0.0.1:8010
```

The frontend prefers port 5175 and proxies /api to 8010. Hot-reload WebSockets
are disabled; refresh the browser after edits. For a local production preview:

```sh
npm run build
node scripts/serve-build.mjs
```

Checks: npm run build and python server/manage.py test api.test_workspace.

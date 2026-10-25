# Ready Candidate deployment and administration

The frontend is a Vite/React static build. The backend remains Django; do not
deploy the frontend alone and expect accounts or saved work to function.

## Local development

Frontend: `npm ci`, then `npm run dev`. The preferred URL is
`http://127.0.0.1:5175`. Vite chooses another available port if needed.
Development hot-reload WebSockets are disabled; refresh after changing files.
Dependency optimization stays enabled to convert React/CommonJS to browser ESM.
Scanning is restricted to `index.html`, excluding Python environment templates.

Backend: install `server/requirements.txt`, run `python server/manage.py migrate`,
then `python server/manage.py runserver 127.0.0.1:8010`. The frontend proxies `/api`
to this port. Use `API_PROXY_TARGET` to point at another backend port.

Production preview: `npm run build`, then `node scripts/serve-build.mjs`.
This dependency-free local server serves `dist` on port 5175 and forwards API
requests to port 8010; it picks another frontend port if 5175 is occupied.

For persistent local startup on this Windows computer, run `powershell -File scripts/start-local.ps1` after building. It starts hidden background servers and records output in `.runtime/`. Occupied ports are left alone; verify the application URLs rather than assuming an existing process belongs to this project.

The original local SQLite database was reconciled after reverting the old
workspace branch. Its complete `db.before-reconcile-*.sqlite3` backup remains
in `server/`. Normal first-version databases should only run Django migrations;
the reconciliation script is a guarded local recovery tool, never a deployment
command. Backups and databases must not be committed.

## Django administration

Create an administrator with `python server/manage.py createsuperuser`, then open
`http://127.0.0.1:8010/admin/`. No default admin credentials are shipped.

- **Workspace settings:** dashboard headline/description, announcement, support
  email, Basic download/ATS/resume limits, Pro resume limit, Basic ₹199 and Pro ₹499 prices in INR,
  and switches for AI and online payment access.
- **Tutorial videos:** add HTTPS YouTube links under Resume, LinkedIn, Cover
  Letters or Account; set duration, display order and active status. Unpublished
  videos do not appear in the UI. Add written lessons and HTTPS PDF/resource links in the same form.
- **Users:** manage names, account status, plan, download and ATS counters.
- **Resumes / Workspace documents:** manage saved resumes, LinkedIn drafts and
  cover letters, including ownership. Regular users only access their own data.
- Legacy free offers and promo redemption are disabled; there is no free plan.
- **Transactions:** inspect pending, captured and failed payments.

The standard Django admin login, permissions and CRUD forms are retained with Ready Candidate branding and improved spacing/colors. Workspace settings can switch Resume Studio, LinkedIn, Cover Letters and learning content on or off. Set `FRONTEND_URL` to your production frontend for the admin's preview link.

On this computer the old venv points to a removed Python installation. The bundled Python can run `scripts/manage_local.py` instead of `server/manage.py`; it uses the existing packages plus repaired same-version HTTP dependencies in `.runtime/python-deps`. For production, create a fresh Python environment and install `server/requirements.txt`.

Local command in PowerShell (replace `runserver` with `createsuperuser` to create your administrator):

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" scripts\manage_local.py runserver 127.0.0.1:8010 --noreload
```

Career Path, interview tools and job/application tracking are not part of this
version's navigation, models or API routes.

## Hosting with the existing Vercel structure

1. Deploy the Django `server/` project with a persistent PostgreSQL database.
   Configure `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`, and `ALLOWED_HOSTS`.
   Run `python manage.py migrate` against that database before serving traffic.
2. Configure `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` to the exact
   frontend HTTPS origin. Arbitrary Vercel subdomains are not trusted.
3. Deploy the frontend using `npm run build` and output directory `dist`.
   Update the `/api` rewrite in `vercel.json` to your backend's URL. A same-origin
   rewrite is preferred for reliable httpOnly cookies. Alternatively set
   `VITE_API_URL` to the API URL and configure the allowed frontend origin.
4. Create the production admin account and add workspace settings/tutorials.
   The local dev server and Vite preview are not production servers.

## External integrations

AI uses server-only `LLM_API_KEY`, `LLM_BASE_URL`, and `LLM_MODEL`. Without them,
manual writing and saving work, and the UI reports that AI is unavailable.
Never put a private API key in a `VITE_` environment variable.

Razorpay checkout uses server-only `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
Enable payment access in workspace settings only after testing credentials.
Use automatic payment capture. The backend verifies the payment signature,
captured state, order owner, amount and currency before activating the purchased Basic or Pro plan. The purchased plan is stored on the transaction; price edits cannot change it. Replayed Basic payments cannot downgrade Pro.
Configure the Razorpay `payment.captured` webhook at
`https://YOUR_BACKEND/api/payments/webhook/` and set
`RAZORPAY_WEBHOOK_SECRET` to the dashboard webhook secret. The signed webhook
also handles checkout windows closed before the browser verifies a payment.
Basic is ₹199 and Pro is ₹499, each a one-time purchase. Both include all 50 resume template models. Basic has configurable resume/download/ATS limits. Pro includes LinkedIn, cover letters and AI services. Unpaid accounts can preview templates but cannot edit, save or download. Upgrading Basic to Pro charges the full Pro price; there is no automatic proration.

Configure keys in the backend environment, never in frontend code or chat. Admin shows whether each integration key is configured without exposing its value. Test both plans in Razorpay test mode before using live keys.

Reference: [Razorpay Python integration and verification](https://razorpay.com/docs/server-integration/python/test-app/).

## Email verification and AI services

Local backend credentials may be stored in `server/.env.local`, which Git ignores. Django loads this file without overriding deployment environment variables. Never store Razorpay secrets in the root frontend environment or any `VITE_` variable. Restart Django after changing local credentials. Local test-mode checkout has been verified with unpaid Basic and Pro orders; completing a simulated payment and configuring the separate webhook secret remain necessary before live use.

The admin login and the frontend sign-in modal include email OTP password recovery. Configure `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` and TLS/SSL settings. The account must already have a unique, valid email address in Django Users. Recovery does not create accounts or grant staff access. Codes expire after 10 minutes, allow five guesses, and can authorize one password reset; previous auth tokens are revoked. Recovery is disabled until SMTP is configured. Use a shared Django cache for production throttling. Test delivery and reset with a disposable account before relying on it for admin access.

Pro Resume Studio supports summary drafting (including early-career candidates), experience bullet improvements, skill recommendations and a resume review. Suggestions are editable and applied only after review; recommended skills require confirmation of actual ability. Existing AI parsing and ATS optimization use the same provider configuration. LinkedIn Studio reviews supplied profile text and produces editable profile drafts. Cover letters use the current resume or an uploaded PDF, DOCX or TXT plus role/company context. Uploaded documents are extracted locally before their text is sent to the configured AI provider.

Set the server-only `LLM_API_KEY`, `LLM_BASE_URL` and `LLM_MODEL` for an OpenAI-compatible provider that supports JSON responses. Django Workspace Settings can override the model and HTTPS endpoint. Keys are never stored in frontend settings. Missing credentials and provider failures preserve existing content. Live provider quality and compatibility still require testing with your chosen model.

LinkedIn URL import uses an optional **authorized profile-data provider**; it does not scrape LinkedIn or bypass login restrictions. Configure `LINKEDIN_PROFILE_API_URL` and `LINKEDIN_PROFILE_API_KEY`. The adapter posts `{ "url": "https://www.linkedin.com/in/..." }` with a Bearer key to the fixed configured HTTPS endpoint and expects `{ "profile_text": "..." }`. If your provider uses a different contract, adapt this server-only connector. Without a provider, users can paste profile text or upload their own PDF export and use all review/drafting tools. A general AI model key alone does not provide LinkedIn profile access. [LinkedIn guidance on automated access](https://www.linkedin.com/help/linkedin/answer/a1341387/prohibition-of-scraping-software).

YouTube lessons play in privacy-enhanced embedded players on the learning page, with fullscreen support. The video owner must allow embedding; removed/private/restricted videos may not play. Written lessons remain on-site; supplemental resource links may open separately. [YouTube embed documentation](https://developers.google.com/youtube/player_parameters).

Writing/checkout throttles use Django's cache. For reliable enforcement across
multiple production instances, configure a shared Django cache. The default
LocMemCache enforces limits only within one backend instance.

Validation: `npm run build` and `python server/manage.py test api.test_workspace`.

Compatible dependency security updates were applied without forcing a major
upgrade. npm audit still reports three moderate findings in Mammoth's transitive
`argparse` / `sprintf-js` chain. npm's suggested Mammoth downgrade is a breaking
change and was not applied. Review this before enabling public document uploads.

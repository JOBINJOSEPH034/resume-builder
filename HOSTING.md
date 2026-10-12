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

The original local SQLite database was reconciled after reverting the old
workspace branch. Its complete `db.before-reconcile-*.sqlite3` backup remains
in `server/`. Normal first-version databases should only run Django migrations;
the reconciliation script is a guarded local recovery tool, never a deployment
command. Backups and databases must not be committed.

## Django administration

Create an administrator with `python server/manage.py createsuperuser`, then open
`http://127.0.0.1:8010/admin/`. No default admin credentials are shipped.

- **Workspace settings:** dashboard headline/description, announcement, support
  email, free download/ATS/resume limits, Pro resume limit, Pro price in INR,
  and switches for AI and online payment access.
- **Tutorial videos:** add HTTPS YouTube links under Resume, LinkedIn, Cover
  Letters or Account; set duration, display order and active status. Unpublished
  videos do not appear in the UI. The app opens the original YouTube link.
- **Users:** manage names, account status, plan, download and ATS counters.
- **Resumes / Workspace documents:** manage saved resumes, LinkedIn drafts and
  cover letters, including ownership. Regular users only access their own data.
- **Offers / Promo codes:** manage free offers and existing promo redemption.
- **Transactions:** inspect pending, captured and failed payments.

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
captured state, order owner, amount and currency before activating Pro.
Configure the Razorpay `payment.captured` webhook at
`https://YOUR_BACKEND/api/payments/webhook/` and set
`RAZORPAY_WEBHOOK_SECRET` to the dashboard webhook secret. The signed webhook
also handles checkout windows closed before the browser verifies a payment.
The current price is a one-time Pro purchase, not a recurring subscription.

Promos from the original app grant Pro for 100% codes. Partial-discount checkout
is not implemented; the UI must not promise a discounted payment amount.

Writing/checkout throttles use Django's cache. For reliable enforcement across
multiple production instances, configure a shared Django cache. The default
LocMemCache enforces limits only within one backend instance.

Validation: `npm run build` and `python server/manage.py test api.test_workspace`.

Compatible dependency security updates were applied without forcing a major
upgrade. npm audit still reports three moderate findings in Mammoth's transitive
`argparse` / `sprintf-js` chain. npm's suggested Mammoth downgrade is a breaking
change and was not applied. Review this before enabling public document uploads.

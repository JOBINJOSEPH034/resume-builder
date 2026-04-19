# CraftCV — Premium ATS Resume Builder

CraftCV is a full-stack SaaS application that allows users to build, analyze, and optimize their resumes using Google Gemini AI, ensuring they pass through Applicant Tracking Systems (ATS).

## 🚀 Tech Stack
- **Frontend:** React 19, Vite, Vanilla CSS
- **Backend:** Django 5, Django REST Framework, PostgreSQL
- **AI Integration:** Google Gemini AI (for bullet point optimization)
- **Deployment:** Vercel (Frontend & Serverless Python Backend), Neon (Serverless Postgres)

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in both the root and `server` directories as needed.

### Frontend (`.env`)
```env
VITE_API_URL=http://localhost:8000/api  # Dev
# VITE_API_URL=https://your-backend.vercel.app/api # Prod
```

### Backend (`server/.env`)
```env
SECRET_KEY=your-secure-random-key
DEBUG=True # Set to False in production
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb
GEMINI_API_KEY=your-google-ai-studio-key
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://craftcv.vercel.app
```

## 🛠️ Local Development Setup

1. **Backend (Terminal 1)**
```bash
cd server
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

2. **Frontend (Terminal 2)**
```bash
npm install
npm run dev
```

## 🚢 Deployment on Vercel

1. **Database:** Create a Neon Postgres database and get the connection string.
2. **Backend:** Deploy the `server` folder to Vercel as a Python project. Make sure to set `DEBUG=False` and all required environment variables.
3. **Frontend:** Deploy the root directory to Vercel as a Vite/React project. Set `VITE_API_URL` to point to your new backend URL.

## 📊 Post-Launch Monitoring (Recommended)

To ensure high availability and catch bugs early:
1. **Error Tracking (Sentry):** Run `npm install @sentry/react` and initialize it in `main.jsx`.
2. **Uptime Monitoring:** Set up UptimeRobot to ping `https://your-backend.vercel.app/api/auth/me/` every 5 minutes.
3. **Usage Alerts:** Set budget limits in Google Cloud console for your Gemini API usage.

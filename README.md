# CodeBuddy AI — Backend REST API & Services

Educational programming companion backend built with Node.js, Express (ES Modules), Supabase PostgreSQL, and interchangeable AI providers (Ollama & Google Gemini).

---

## 🚀 Features

- **Interchangeable AI Service Layer:**
  - **Local Ollama:** `gemma3:1b` (100% offline, zero API costs)
  - **Google Gemini:** `gemini-1.5-flash` / Pro via `@google/generative-ai`
- **Pedagogical AI Endpoints:**
  - `POST /api/ai/explain`: Line-by-line breakdown, concept list, program summary, and analogies.
  - `POST /api/ai/debug`: Root-cause diagnosis, syntax vs. logic classification, and minimal fixes.
  - `POST /api/ai/practice/generate`: Structured programming exercises.
  - `POST /api/ai/hints`: 5-level progressive hint system (unrevealed hints never sent ahead).
  - `POST /api/ai/solution`: Full solution requiring explicit confirmation.
  - `POST /api/ai/chat`: Multi-turn conversational AI tutoring.
- **Supabase PostgreSQL Persistence & RLS Security:**
  - Row Level Security on all tables (`profiles`, `conversations`, `practice_problems`, `practice_attempts`, `learning_activity`).
- **Security & Reliability:**
  - Helmet headers, dynamic LAN CORS, Zod request validation, rate limiting, and centralized error handling.
- **Automated Tests:**
  - 24 tests passing with Vitest (`npm test`).

---

## 🛠️ Getting Started

### 1. Configure Environment
Copy `.env.example` to `.env`:
```powershell
cp .env.example .env
```
Fill in your Supabase credentials:
```env
PORT=5000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key

AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma3:1b
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Run Automated Tests
```powershell
npm test
```

### 4. Start Development Server
```powershell
npm run dev
```
Server listens on: `http://localhost:5000/`  
Health check: `http://localhost:5000/api/health`  
AI Health: `http://localhost:5000/api/health/ai`


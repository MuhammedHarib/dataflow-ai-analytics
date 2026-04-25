# DataFlow AI 🚀
### AI-Powered Analytics Platform — v2.1

> Upload your data. Ask questions in plain English. Build beautiful dashboards — no SQL, no code.

![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)
![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite)
![Status](https://img.shields.io/badge/Status-Production%20Prototype-orange?style=flat-square)

---

## 📖 What Is DataFlow?

DataFlow is a full-stack AI analytics platform that lets you:

- **Upload** structured datasets (CSV, XLSX, JSON, TSV, Parquet)
- **Chat** with your data in plain English via a Groq-powered LLM (`llama-3.1-70b`)
- **Build** interactive drag-and-drop dashboards with 10 chart types
- **Save** dashboard layouts that persist across sessions — no re-uploading needed

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI 0.110 + Python 3.11 |
| Database | SQLAlchemy 2.0 + SQLite (PostgreSQL-ready) |
| LLM | Groq API — `llama-3.1-70b` |
| Data Processing | pandas, openpyxl, pyarrow |
| Frontend | React 18 + Vite 5 (JSX) |
| Routing | react-router-dom v6 |
| Dashboard Canvas | react-grid-layout |
| Charts | Recharts (10 chart types) |
| HTTP Client | Axios |

---

## 📁 Project Structure

```
fastapi-react-project/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── chat.py              # POST /chat/ — AI reply routing
│   │   │   ├── chat_history.py      # Chat session CRUD
│   │   │   ├── dashboards.py        # Dashboard CRUD
│   │   │   ├── datasets.py          # CSV/XLSX upload + chart data
│   │   │   └── projects.py          # Project CRUD
│   │   ├── db/
│   │   │   ├── database.py          # SQLAlchemy engine + session
│   │   │   ├── models.py            # ORM models (6 tables)
│   │   │   └── init_db.py           # DB initialisation
│   │   ├── services/
│   │   │   └── analysis_service.py  # Groq calls + pandas analysis
│   │   ├── utils/
│   │   │   └── intent_detector.py   # Casual vs analytical query routing
│   │   └── main.py                  # FastAPI app factory
│   ├── requirements.txt
│   └── venv/
└── frontend/
    ├── src/
    │   ├── api/client.js             # Axios API methods
    │   ├── components/
    │   │   └── dashboards/
    │   │       └── DashboardBuilder.jsx  # Main 1,100-line canvas
    │   ├── context/AppContext.jsx    # Global state
    │   ├── views/
    │   │   ├── ChatView.jsx          # Standalone AI chat
    │   │   └── ProjectChatView.jsx   # Project-scoped AI chat
    │   └── App.jsx
    ├── index.html
    └── package.json
```

---

## ⚡ Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Groq API key](https://console.groq.com/) (free tier available)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/fastapi-react-project.git
cd fastapi-react-project
```

---

### 2. Backend Setup

```bash
cd backend

# Activate the virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
python -m pip install -r requirements.txt

# Add your Groq API key
# Create a .env file in backend/ with:
# GROQ_API_KEY=your_key_here
```

> **Windows note:** If `pip.exe` or `uvicorn.exe` are blocked by an Application Control policy, prefix every command with `python -m`:
> ```powershell
> python -m pip install -r requirements.txt
> python -m uvicorn app.main:app --reload
> ```

Start the backend:

```bash
python -m uvicorn app.main:app --reload
# Server runs at http://127.0.0.1:8000
```

---

### 3. Frontend Setup

Open a **second terminal**:

```bash
cd fastapi-react-project/frontend

npm install
npm run dev
# App runs at http://localhost:5173 (or 5174 if 5173 is busy)
```

---

### 4. Open the App

Visit `http://localhost:5173` in your browser. The backend API docs are available at `http://localhost:8000/docs`.

---

## 🔑 Environment Variables

Create a file at `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

> The app will start without this key but all AI chat and analysis features will fail.

---

## ✨ Features

| Feature | Status |
|---|---|
| Drag-and-drop dashboard canvas | ✅ Complete |
| 10 chart types (Bar, Line, Pie, KPI, Radar, etc.) | ✅ Complete |
| AI dashboard generation from natural language | ✅ Complete |
| Dataset persistence (no re-upload on revisit) | ✅ Complete |
| Project-scoped AI chat | ✅ Complete |
| Global filters + drill-down | ✅ Complete |
| Auto-save dashboards (2s debounce) | ✅ Complete |
| 6 colour themes | ✅ Complete |
| User authentication (JWT) | 🔜 Planned |
| PostgreSQL migration | 🔜 Planned |
| RAG / vector search (ChromaDB) | 🔜 Planned |
| Slack bot integration | 🔜 Planned |
| Dashboard export (PDF/PNG) | 🔜 Planned |

---

## 🗄️ Database Schema

The app uses **6 tables**: `users`, `projects`, `datasets`, `dashboards`, `chat_sessions`, `chat_messages`.

The database file (`dataflow.db`) is auto-created in `backend/` on first run. No manual migration needed for development.

---

## 🔄 How It Works

### Data Flow: CSV → Dashboard
1. User uploads a file via the UI
2. pandas parses it and stores up to 5,000 rows as JSON in SQLite
3. Groq generates a dataset profile for AI context
4. `DashboardBuilder` fetches the stored JSON and renders charts instantly on every revisit

### AI Chat Routing
1. Message hits `POST /chat/`
2. `intent_detector.py` classifies it as casual or analytical
3. Analytical queries get the dataset profile injected into the Groq system prompt
4. Response is streamed back and optionally rendered as a chart

---

## 🐛 Known Issues

- Recharts may briefly show `width: -1` on first mount — cosmetic only
- Widgets saved without explicit positions may stack at `(0,0)` on reload
- `intent_detector` occasionally misclassifies short queries like "sum sales" as casual

---

## 📄 License

MIT — see `LICENSE` for details.

---

<p align="center">Built with FastAPI + React · Powered by Groq LLM</p>

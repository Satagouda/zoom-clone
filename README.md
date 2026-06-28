# ZoomClone — Full-Stack Video Conferencing App

> A full-featured Zoom clone built as a full-stack engineering assignment.  
> **Tech:** Next.js 14 (App Router) · FastAPI · SQLite · SQLAlchemy · Tailwind CSS

---

## 📸 Screenshots

| Dashboard | Meeting Room |
|-----------|-------------|
| ![Dashboard — Upcoming meetings, action cards](docs/screenshot-dashboard.png) | ![Meeting Room — Video grid, control bar](docs/screenshot-meeting.png) |

> _Screenshots go in `docs/`. Run the app locally to see the live UI._

---

## 🛠 Tech Stack

| Layer        | Technology                        | Version  |
|--------------|-----------------------------------|----------|
| **Frontend** | Next.js (App Router, TypeScript)  | 14.x     |
| **Styling**  | Tailwind CSS                      | 3.x      |
| **Icons**    | Lucide React                      | latest   |
| **HTTP**     | Axios (with camelCase transform)  | latest   |
| **Backend**  | FastAPI                           | 0.115.x  |
| **ORM**      | SQLAlchemy                        | 2.x      |
| **Database** | SQLite (WAL mode)                 | built-in |
| **Validation** | Pydantic v2                    | 2.x      |
| **Server**   | Uvicorn (ASGI)                    | 0.34.x   |
| **Deployment** | — (see Deployment section)     | —        |

---

## ✨ Features

### Core
- **Instant Meeting** — create a live meeting with one click, auto-generates a Zoom-style `XXX-XXX-XXX` join code
- **Scheduled Meeting** — pick a date, time, and duration; meeting appears in the Upcoming list
- **Join Meeting** — enter any valid meeting code to join as a named participant
- **Dashboard** — Zoom-accurate layout: 4 action cards + Upcoming section + Recent section
- **Meeting Room** — full-screen dark UI: 2×2 video tile grid, real participant data, elapsed timer
- **Participants Panel** — toggleable slide-in panel with live participant list from the API
- **End Meeting** — calls `DELETE /api/meetings/{id}` and returns to dashboard
- **Copy Invite Link** — one-click clipboard copy of the unique invite URL per meeting
- **Toast Notifications** — bottom-center toasts for all success/error feedback
- **Loading Skeletons** — pulse-animated placeholders while API calls complete

### API
- `POST /api/meetings/instant` — create & immediately activate an instant meeting
- `POST /api/meetings/schedule` — schedule a future meeting with validation
- `GET  /api/meetings/upcoming` — upcoming (waiting) meetings for the default user
- `GET  /api/meetings/recent` — last 10 ended/active meetings
- `GET  /api/meetings/{meetingId}` — single meeting by Zoom-style join code
- `POST /api/meetings/{meetingId}/join` — idempotent join; auto-activates waiting meetings
- `GET  /api/meetings/{meetingId}/participants` — ordered participant list
- `DELETE /api/meetings/{meetingId}` — host-only delete (204 No Content)
- `GET  /health` — DB connection check with row counts

### Design
- Matches **Zoom's actual color palette**: `#0B5CFF` blue, `#FF6B00` orange, `#EB5757` red, `#1C1C2E` navy
- 56px Navbar with rounded-square camera logo, bell + search icons, avatar
- 160×160 action cards with `scale(1.03)` hover animation
- Modal open: fade-in + scale from 0.95→1.0 in 150ms
- Meeting room: `#2D2D3A` video tiles (8px radius), 48px circular control buttons, red pill "End" button
- Inter font, monospace meeting ID with wide letter-spacing

---

## 🗃 Database Schema

```
┌───────────────────────────────┐
│            users              │
├───────────────────────────────┤
│ id          STRING  PK        │
│ name        STRING  NOT NULL  │
│ email       STRING  UNIQUE    │
│ avatar_url  STRING  NULL      │
│ created_at  DATETIME          │
└──────────────┬────────────────┘
               │ 1
               │ hosts (host_id → users.id)
               │ N
┌──────────────▼────────────────┐
│           meetings            │
├───────────────────────────────┤
│ id               STRING  PK   │
│ meeting_id       STRING  UNIQUE  ← Zoom-style join code (XXX-XXX-XXX)
│ title            STRING        │
│ description      TEXT    NULL  │
│ host_id          STRING  FK → users.id
│ type             ENUM  instant|scheduled
│ status           ENUM  waiting|active|ended
│ scheduled_at     DATETIME NULL │
│ duration_minutes INTEGER       │
│ invite_link      STRING  UNIQUE │
│ created_at       DATETIME       │
└──────────────┬────────────────┘
               │ 1
               │ N
┌──────────────▼────────────────┐
│         participants          │
├───────────────────────────────┤
│ id           STRING  PK       │
│ meeting_id   STRING  FK → meetings.id (CASCADE DELETE)
│ user_id      STRING  FK → users.id (SET NULL, nullable for guests)
│ display_name STRING           │
│ joined_at    DATETIME         │
│ left_at      DATETIME  NULL   │
│ is_host      BOOLEAN          │
│                               │
│ UNIQUE (meeting_id, user_id)  │
└───────────────────────────────┘

Relationships:
  users      1──N  meetings     (via meetings.host_id)
  meetings   1──N  participants (via participants.meeting_id)
  users      1──N  participants (via participants.user_id, nullable)

SQLite extras:
  - WAL mode enabled for concurrent reads
  - PRAGMA foreign_keys = ON enforced at connection time
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Python** 3.11+
- **Node.js** 18+
- **npm** 9+

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/zoom-clone.git
cd zoom-clone
```

### 2. Backend setup

```bash
cd backend

# Create and activate a virtual environment (recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Seed the database with sample data
python seed.py

# Start the API server
uvicorn main:app --reload --port 8000
```

API is now running at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

### 3. Frontend setup

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend is now running at **http://localhost:3000**

### 4. Environment variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> The default value is already hardcoded in `lib/api.ts` so this step is optional for local development.

---

## 💡 Assumptions Made

| Area | Decision |
|------|----------|
| **Authentication** | No auth system — a single hardcoded default user (`default-user-001`, Raj Kumar) is used for all operations, matching the assignment scope |
| **Meeting ID format** | API-created meetings use `XXX-XXX-XXX` (9-digit, Zoom-style). Seed data uses a 10-char alphanumeric code from the earlier phase; both formats are valid |
| **Invite link** | Format: `http://localhost:3000/meeting/join?invite=<uuid4>` — unique per meeting |
| **Video / Audio** | No real WebRTC — the meeting room uses fake participant tiles with initials. This is a UI/API integration demo |
| **Guest participants** | `participants.user_id` is nullable; guests who join via invite link (no account) have `user_id = null` |
| **Meeting activation** | A `waiting` meeting auto-transitions to `active` when the first participant joins via the `/join` endpoint |
| **Idempotent join** | Re-joining the same meeting as the same registered user returns the existing participant record instead of creating a duplicate |
| **Delete semantics** | `DELETE /api/meetings/{id}` performs a hard delete (CASCADE to participants). Only the host user can delete their own meetings |
| **Database** | SQLite with WAL mode — suitable for development; swap to PostgreSQL for production |
| **Snake_case ↔ camelCase** | The Axios client transparently transforms all API field names so TypeScript code uses camelCase throughout |
| **Deployment** | Not deployed — see placeholder links below |

---

## 🌐 Deployment

| Service | URL |
|---------|-----|
| **Frontend** (Vercel) | `[Frontend URL — not yet deployed]` |
| **Backend** (Railway / Render) | `[Backend URL — not yet deployed]` |

---

## 📁 Project Structure

```
zoom-clone/
├── backend/
│   ├── main.py              # FastAPI app factory, CORS, lifespan
│   ├── database.py          # SQLAlchemy engine, session, WAL config
│   ├── models.py            # ORM: User, Meeting, Participant
│   ├── schemas.py           # Pydantic v2 request/response models
│   ├── seed.py              # Dev data seeder
│   ├── requirements.txt     # Python dependencies
│   └── routers/
│       ├── meetings.py      # Meeting CRUD + lifecycle routes
│       └── participants.py  # Join & list participants
│
└── frontend/
    └── src/
        ├── app/
        │   ├── layout.tsx           # Root layout, Inter font, Toaster
        │   ├── page.tsx             # Dashboard (home)
        │   ├── globals.css          # Tailwind + Zoom design tokens
        │   └── meeting/
        │       └── [meetingId]/
        │           └── page.tsx     # Meeting room
        ├── components/
        │   └── Navbar.tsx           # Top navigation bar
        ├── lib/
        │   └── api.ts               # Axios client + all API functions
        └── types/
            └── index.ts             # TypeScript interfaces
```

---

## 📄 License

MIT — feel free to use this as a reference implementation.

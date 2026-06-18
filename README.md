# CollabDocs — Real-time Collaborative Editor

A Google Docs-style collaborative editor with live cursors, conflict-free real-time sync, and version history.

## Tech Stack
- **Frontend:** React 18, Vite, Slate.js, Yjs (CRDT), Socket.io, Zustand, Tailwind CSS
- **Backend:** Node.js, Express, Socket.io, Yjs WebSocket server, MongoDB, Redis
- **Infra:** Docker Compose (local), Vercel (frontend), Railway (backend)

## Local Development

### Prerequisites
- Node.js 18+
- Docker + Docker Compose

### Setup
```bash
# 1. Start databases
docker compose up -d

# 2. Install & run backend
cd server && npm install && npm run dev

# 3. Install & run frontend (new terminal)
cd client && npm install && npm run dev
```

Frontend → http://localhost:5173  
Backend  → http://localhost:4000  
Health   → http://localhost:4000/health

## Project Structure
```
collab-tool/
├── client/                  # React frontend
│   └── src/
│       ├── components/      # Reusable UI (Editor, Toolbar, Presence...)
│       ├── pages/           # Route pages (Login, Dashboard, Doc)
│       ├── store/           # Zustand state (auth, doc)
│       ├── hooks/           # Custom hooks
│       └── lib/             # Axios instance, helpers
├── server/                  # Node.js backend
│   └── src/
│       ├── config/          # DB + Redis connections
│       ├── models/          # Mongoose schemas
│       ├── routes/          # Express routers
│       ├── middleware/       # Auth, error handling
│       ├── controllers/     # Route handlers
│       └── jobs/            # BullMQ background jobs
└── docker-compose.yml       # MongoDB + Redis for local dev
```

## Build Phases
- [x] Phase 1 — Project setup & scaffolding
- [ ] Phase 2 — Auth (register, login, JWT)
- [ ] Phase 3 — Document CRUD + Slate.js editor
- [ ] Phase 4 — Real-time sync (Yjs + Socket.io)
- [ ] Phase 5 — Cursor presence, sharing, version history
- [ ] Phase 6 — Deploy & polish

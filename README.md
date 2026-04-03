# 🧠 Memora — Your Second Brain

> Save anything from the web. AI organizes, connects, and resurfaces it for you.

![Memora](https://img.shields.io/badge/Stack-MERN-2D6A4F?style=flat-square)
![Live](https://img.shields.io/badge/Live-Deployed-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

🔗 **Live App**: [memora-three-iota.vercel.app](https://memora-three-iota.vercel.app)
🔗 **API**: [memora-backend-24mk.onrender.com/api/health](https://memora-backend-24mk.onrender.com/api/health)

---

## ✦ Features

| Feature | Description |
|---|---|
| **Save Anything** | Articles, tweets, videos, images, PDFs, notes, links |
| **AI Tagging** | Multi-LLM semantic tag generation (Gemini + Mistral + Cohere) |
| **YouTube Support** | Auto-fetches title, channel, thumbnail via oEmbed — no scraping needed |
| **AI Re-analyze** | Re-run AI tagging on any existing item to fix stale clusters/tags |
| **Semantic Search** | AI-powered search using Google Gemini embeddings |
| **Internet Search** | Live web results from YouTube, Dev.to, and Wikipedia alongside saved items |
| **Search History** | Clickable recent searches with delete support |
| **Topic Clustering** | Groups items into knowledge domains (tech, design, culture, health, etc.) |
| **Knowledge Graph** | D3.js interactive visualization of how items connect |
| **Memory Resurface** | "2 months ago you saved this..." rediscovery engine |
| **Collections** | Curated folders with emoji + color |
| **Workspaces & Notes** | Create workspaces with rich markdown notes |
| **Dashboard Note Cards** | Workspace notes on dashboard with date, delete button, and consistent card design |
| **Related Items** | Automatic cross-linking of related knowledge |
| **Chrome Extension** | One-click save from any webpage |
| **Secure Auth** | httpOnly cookie-based JWT auth (XSS-proof) |

---

## 🗂 Project Structure

```
memora/
├── client/                    # React + Vite frontend (deployed on Vercel)
│   └── src/
│       ├── components/
│       │   ├── layout/        # Sidebar, Header
│       │   ├── dashboard/     # ItemCard (with Re-analyze)
│       │   ├── graph/         # D3 KnowledgeGraph
│       │   ├── notes/         # NoteEditor
│       │   └── save/          # SaveItemModal
│       ├── context/           # AuthContext, ItemsContext (patchItem)
│       ├── pages/             # Dashboard, Library, Search, Resurface, Workspace
│       ├── services/          # Axios API client (withCredentials)
│       └── utils/             # helpers
│
├── server/                    # Express + MongoDB backend (deployed on Render)
│   └── src/
│       ├── config/            # database.js
│       ├── controllers/       # auth, item (+ reanalyze), note, workspace
│       ├── middleware/        # auth.middleware.js (cookie-based)
│       ├── models/            # User, Item, Collection, Note, Workspace
│       ├── routes/            # REST API routes
│       └── services/          # aiTagging, aiRouter, embedding, scraper (YouTube oEmbed)
│
├── extension/                 # Chrome Extension
│   ├── manifest.json
│   ├── popup.html / popup.js
│   └── background.js
│
├── ARCHITECTURE.md            # System architecture deep-dive
├── DEPLOYMENT.md              # Full deployment guide (Render + Vercel)
└── SCALE_UP.md                # Scale-up plan: Pinecone, BullMQ, ImageKit
```

---

## 🚀 Getting Started (Local)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Gemini API key (free tier)

### Install & Run

```bash
# Clone
git clone https://github.com/Deepakdass1326/Memora.git
cd Memora

# Install all dependencies
npm run install:all

# Configure backend
cp server/.env.example server/.env
# Fill in: MONGODB_URI, JWT_SECRET, GEMINI_API_KEY

# Start both client + server
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health check**: http://localhost:5000/api/health

---

## 🤖 AI Architecture

Memora uses a **multi-LLM routing system** to distribute AI load and avoid rate limits:

| Task | Primary Model | Fallback |
|---|---|---|
| Generate Note | Gemini 2.5 Flash | Mistral |
| Summarize | Mistral | Gemini |
| Auto-Tagging | Cohere | Gemini |
| Embeddings | Gemini text-embedding-004 | — |

If a model's API key is missing, it is automatically skipped.

### YouTube Smart Scraping
YouTube blocks generic scrapers. Memora detects YouTube URLs and uses the **oEmbed API** to reliably fetch the video title, channel name, and high-quality thumbnail automatically.

### Topic Cluster Guide
| Cluster | Content Types |
|---|---|
| `culture` | YouTube, comedy, music, film, TV, gaming, sports, food, travel |
| `technology` | Programming, AI, software, tools, web, apps |
| `science` | Research, biology, physics, environment |
| `business` | Startups, finance, marketing, product |
| `health` | Fitness, nutrition, wellness, medicine |
| `philosophy` | Ethics, psychology, mindset, thinking |
| `productivity` | Habits, workflows, planning, time management |
| `design` | UX/UI, visual design, CSS, branding |

---

## 🔒 Security

- **Authentication**: `httpOnly` secure cookies (not localStorage) — XSS-proof
- **CORS**: Configured for Vercel frontend and Chrome Extension origin
- **Rate Limiting**: Global + per-auth-route rate limiting via `express-rate-limit`
- **Cookie Policy**: `sameSite: none` + `secure: true` in production for cross-domain

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in (sets cookie) |
| POST | `/api/auth/logout` | Sign out (clears cookie) |
| GET | `/api/auth/me` | Current user session |

### Items
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/items` | List items |
| POST | `/api/items` | Save new item (AI tags auto-generated) |
| GET | `/api/items/graph` | Knowledge graph data |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |
| PATCH | `/api/items/:id/favorite` | Toggle favorite |
| POST | `/api/items/:id/reanalyze` | Re-run AI tagging + re-scrape YouTube |

### Search
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search?q=` | Semantic + internet search |
| GET | `/api/search/history` | Recent search queries |
| DELETE | `/api/search/history/:query` | Remove from history |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tags` | All user tags with counts |
| GET | `/api/resurface` | Memory resurfacing groups |
| GET | `/api/collections` | User collections |
| GET | `/api/workspaces` | Workspaces |
| GET | `/api/notes?workspace=` | Notes in a workspace |
| DELETE | `/api/notes/:id` | Delete a note |

---

## 🧩 Tech Stack

**Frontend**
- React 18 + Vite + React Router 6
- D3.js v7 — knowledge graph visualization
- Axios with `withCredentials: true` — cookie-based auth
- SCSS + CSS custom properties — design tokens
- Deployed on **Vercel**

**Backend**
- Node.js + Express
- MongoDB Atlas + Mongoose
- `httpOnly` cookie auth via `cookie-parser`
- `@google/generative-ai` + LangChain — Gemini embeddings & tagging
- YouTube oEmbed API — reliable video metadata extraction
- Deployed on **Render**

**Chrome Extension**
- Manifest V3
- Content script + background service worker
- Communicates with live Render backend via cookies

---

## 🌐 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full step-by-step deployment guide covering Render, Vercel, and the Chrome Extension.

---

## 📄 License

MIT © 2026 Memora

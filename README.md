<div align="center">

<img src="https://img.shields.io/badge/Memora-AI%20Knowledge%20Graph-6366f1?style=for-the-badge&logo=brain&logoColor=white" alt="Memora" />

<br /><br />

<h1>🧠 Memora — Your Intelligent Second Brain</h1>

<p>A full-stack AI-powered knowledge operating system that <strong>saves, auto-tags, interlinks, and resurfaces</strong> everything you want to remember.</p>

<br />

[![Live App](https://img.shields.io/badge/🚀%20Live%20App-Visit%20Memora-6366f1?style=for-the-badge)](https://memora-frontend.vercel.app)
[![Backend Health](https://img.shields.io/badge/API-Online-22c55e?style=for-the-badge)](https://memora-backend-24mk.onrender.com/api/health)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](#)

</div>

---

## 📌 What is Memora?

We save hundreds of links, articles, videos, and notes every week — and forget most of them within days.

**Memora solves this.** It is a minimalist, high-performance knowledge operating system inspired by Notion, Readwise, and Obsidian — but with a fully autonomous AI engine working in the background.

When you save something, Memora's AI workers read the content, generate semantic tags, compute topic clusters, create embeddings, and map relationships to everything else you have ever saved — all without you lifting a finger.

---

## ✨ Feature Highlights

### 📚 Unified Library
Save and organize anything:
- **Articles & Blog Posts** — auto-summarized and tagged
- **YouTube Videos** — title, thumbnail, and channel stored
- **PDFs** — content extracted and indexed
- **Plain Notes** — rich-text editor with full formatting
- **Bookmarks** — any URL captured and categorized

All content lives in a clean, filterable library with full-text search.

---

### 🔍 Omni-Search (3 Sources in 1)
One search bar, three powerful sources rendered simultaneously:
1. **📂 Your Library** — shows matching items and notes from your personal collection
2. **📺 YouTube** — fetches relevant video results via YouTube Data API v3
3. **🌐 Web** — scrapes live DuckDuckGo results using Cheerio (no API key needed)

Search only fires on **Enter / Search button** — zero unnecessary API calls while typing.

---

### 🕸️ Knowledge Graph
An interactive visual graph that maps everything you know:
- **Nodes** represent individual items and notes
- **Edges** connect nodes that share tags, topic clusters, or explicit relationships
- The graph uses an **O(n×m) tag-index algorithm** for instant linking without blocking the server

---

### 🤖 Multi-LLM Routing (AI Engine)
Every saved item is automatically processed in the background by an intelligent AI router:

| Task | Model Used | Why |
|---|---|---|
| Auto-tagging & Categorization | Gemini Flash | Fast, cheap, accurate for classification |
| Long-form Summarization | Cohere Command | Optimized for document summarization |
| Semantic Embedding | Gemini Embedding | High-dimensional vectors for similarity search |

The router dispatches tasks via **BullMQ + Redis queues** — your UI never waits for AI.

---

### 🔁 Memory Resurfacing
Inspired by spaced repetition, Memora intelligently resurfaces forgotten content:
- **"Today in History"** — items you saved exactly 1 year ago
- **"6 Months Ago", "3 Months Ago"** — memory check-ins
- **"Hidden Gems"** — items saved long ago that you have barely reviewed
- All resurface queries fire in **parallel** using `Promise.all()` for sub-50ms response time

---

### 📝 Rich-Text Workspace / Notes
- Workspaces group multiple notes together like a mini Notion
- Notes editor supports headings, lists, code blocks, tables, and more
- Notes are full participants in the Knowledge Graph — they link to Items automatically via shared tags

---

### 🔌 Chrome Extension
A lightweight browser extension that lets you:
- Save any webpage to your Memora library in one click
- Automatically captures the page title, URL, description, and thumbnail
- Communicates securely with the backend via httpOnly cookies

#### How to Install the Extension (For New Users)
Since the extension is currently in beta and not yet on the Chrome Web Store, you can manually install it via Google Drive:
1. **Download the Extension:** [Open Memora Extension Folder (Google Drive)](https://drive.google.com/drive/folders/1aNzB-bnQppf7jEz6qy2BN116k7HcTWPt?usp=sharing)
2. Click the **Download** button on the folder (Google Drive will automatically download it as a `.zip` file), and extract it to your computer.
3. Open Google Chrome and go to `chrome://extensions/`
4. Turn ON **Developer mode** (toggle in the top-right corner).
5. Click **Load unpacked** and select the folder you just extracted.
6. Pin the Memora extension to your toolbar. Log in to the web app to automatically sync your account, and you're ready to save!

---

## 🏗️ Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MEMORA ARCHITECTURE                            │
│                                                                             │
│   ┌──────────────┐    ┌───────────────────┐    ┌───────────────────────┐  │
│   │   React UI   │───▶│  Express REST API  │───▶│   MongoDB Atlas       │  │
│   │   (Vite)     │    │   (Node.js)        │    │   (Aggregation Pipelines)│ │
│   └──────────────┘    └────────┬──────────┘    └───────────────────────┘  │
│          │                     │                                            │
│          │               ┌─────▼──────┐                                    │
│          │               │ Redis Queue │  (Upstash / BullMQ)               │
│          │               └─────┬──────┘                                    │
│          │                     │                                            │
│   ┌──────┴──────┐       ┌──────▼──────────────────────────────────┐       │
│   │  Chrome     │       │           AI Router Service               │       │
│   │  Extension  │       │  Gemini  │  Cohere  │  Mistral           │       │
│   └─────────────┘       └──────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Data Flow

```
1. USER SAVES AN ITEM
   └─▶ POST /api/items (or Chrome Extension popup.js)
       └─▶ MongoDB saves raw metadata immediately (fast response to UI)
           └─▶ BullMQ dispatches background AI job to Redis queue

2. BACKGROUND AI PROCESSING (non-blocking)
   └─▶ Worker picks up the job
       └─▶ AI Router selects optimal model (Gemini / Cohere / Mistral)
           └─▶ Model: generates tags, topic cluster, summarization, embedding
               └─▶ MongoDB item updated silently (aiProcessing flag → false)

3. KNOWLEDGE GRAPH LINKING
   └─▶ New item's tags compared against all existing entities
       Using O(n×m) tag-index Map (not O(n²) nested loops)
           └─▶ Edges added to linked items in MongoDB

4. USER SEARCHES
   └─▶ Promise.all() fires 3 queries simultaneously:
       ├─▶ MongoDB: regex match on user's library
       ├─▶ YouTube Data API: video results
       └─▶ DuckDuckGo HTML scrape: live web results (via Cheerio)
           └─▶ All merged & returned in a single unified response
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18 + Vite** | UI framework with lightning-fast HMR |
| **React Router DOM** | Client-side routing & navigation |
| **Zustand** | Lightweight global state management |
| **Framer Motion** | Micro-animations and transitions |
| **Remixicon** | Icon library |
| **Vanilla CSS / SCSS** | Custom design system (no Tailwind) |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | REST API server |
| **MongoDB + Mongoose** | Primary database with compound indexes |
| **Redis (Upstash)** | Queue broker and cache layer |
| **BullMQ** | Async job queue for AI processing |
| **Cheerio** | Web scraping for DuckDuckGo results |
| **Compression** | Gzip middleware — reduces response size ~80% |
| **cookie-parser** | Secure httpOnly cookie handling |

### AI & External APIs
| Technology | Purpose |
|---|---|
| **Google Gemini** | Auto-tagging, summarization, embeddings |
| **Cohere** | Command model for long-form summarization  |
| **YouTube Data API v3** | Fetch video metadata for search results |
| **ImageKit.io** | CDN-backed image and file storage |

---

## ⚡ Performance Optimizations

These are intentional engineering decisions made to keep Memora fast at scale:

| Optimization | Before | After | Improvement |
|---|---|---|---|
| Tags endpoint | Full collection scan in Node.js | MongoDB `$unwind` + `$group` aggregation | ~5× faster |
| Resurface endpoint | 5 sequential DB queries | `Promise.all()` parallel queries | ~4× faster |
| Knowledge Graph links | O(n²) nested forEach | O(n×m) tag Map index | ~5× faster, non-blocking |
| Auth middleware | DB hit on every request | In-memory user cache (30s TTL) | ~80% fewer DB reads |
| DB Queries | Missing `isArchived` in indexes | Compound `{user, isArchived, createdAt}` indexes | Eliminates full collection scans |
| API responses | Uncompressed JSON | Gzip compression via `compression` middleware | ~80% smaller payloads |

---

## 🔒 Security Design

- **HttpOnly Cookies** — JWT tokens are **never** stored in `localStorage`. Auth uses `httpOnly`, `Secure`, `SameSite=Strict` cookies — fully XSS-proof
- **In-Memory Auth Cache** — User lookups cached server-side with 30s TTL to prevent database DDoS from auth-hammering
- **Rate Limiting** — `express-rate-limit` applied globally
- **Input Sanitization** — All scraped or user-provided HTML is sanitized before processing or storage
- **Protected Routes** — Every API endpoint behind a `protect` middleware guard; no data leaks between users

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js v18+
- A MongoDB Atlas cluster (free tier works)
- A Redis server — [Upstash free tier](https://upstash.com/) recommended
- API Keys: Gemini, Cohere, YouTube Data API v3

### 1. Clone the Repository
```bash
git clone https://github.com/Deepakdass1326/Memora.git
cd Memora
```

### 2. Install Dependencies
```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 3. Configure Environment Variables
Create `server/.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:5173

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=a_long_random_secret_string

REDIS_URL=your_upstash_redis_url

GEMINI_API_KEY=your_gemini_api_key
COHERE_API_KEY=your_cohere_api_key
YOUTUBE_API_KEY=your_youtube_data_api_key

IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Run the App
```bash
# Terminal 1 — Backend API + BullMQ Worker
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open **http://localhost:5173** 🎉

---

## 📁 Project Structure

```
Memora/
├── client/                  # React + Vite Frontend
│   ├── src/
│   │   ├── pages/           # Dashboard, Library, Search, Graph, Workspace
│   │   ├── components/      # Reusable UI (ItemCard, Sidebar, Navbar)
│   │   ├── store/           # Zustand global state
│   │   ├── services/        # Axios API calls
│   │   └── styles/          # Global CSS design system
│   └── vercel.json          # Vercel deployment config (SPA rewrites)
│
├── server/                  # Node.js + Express Backend
│   ├── src/
│   │   ├── controllers/     # Business logic (item, note, auth, graph)
│   │   ├── models/          # Mongoose schemas with compound indexes
│   │   ├── routes/          # API route definitions
│   │   ├── middleware/       # auth guard, error handler
│   │   ├── services/        # AI router, embedding, storage
│   │   ├── queues/          # BullMQ job definitions
│   │   └── config/          # Database connection
│   └── .env                 # Environment variables (git-ignored)
│
└── extension/               # Chrome Extension
    ├── manifest.json
    ├── popup.html / popup.js
    └── background.js
```

---

<div align="center">

Made with ❤️ by [Deepak Dass](https://github.com/Deepakdass1326)

⭐ **Star this repo** if Memora helped you build a smarter second brain!

</div>

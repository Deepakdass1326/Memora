<div align="center">
  <h1>🧠 Memora</h1>
  <p><strong>Your AI-Powered Second Brain & Intelligent Knowledge Graph</strong></p>
  
  [![Tech Stack](https://img.shields.io/badge/Stack-MERN%20%7C%20Vite%20%7C%20BullMQ-2D6A4F?style=for-the-badge)](#)
  [![Status](https://img.shields.io/badge/Status-Active-blue?style=for-the-badge)](#)
  [![Security](https://img.shields.io/badge/Security-HttpOnly%20Auth-red?style=for-the-badge)](#)
</div>

<br />

**Memora** is a minimalist, high-performance knowledge operating system built to solve information overload. It allows users to seamlessly save notes, bookmarks, videos, and articles, while autonomous AI agents automatically tag, organize, and map the relationships between them.

---

### 🌟 Live Demo
🟢 [**Memora Web App - Live Preview**](https://memora-backend-24mk.onrender.com)

*(Note: The link above connects to the active backend. The frontend URL connects securely to this API.)*

---

## ✨ Features

- **Intelligent Knowledge Graph:** Move beyond folders. Memora visualizes connections between scattered notes, articles, and bookmarks using automated context discovery and AI embeddings.
- **Smart Omni-Search Engine:** A single search bar that simultaneously queries your personal library, related YouTube metadata, and direct DuckDuckGo/Web scraper results.
- **Autonomous Multi-LLM Routing:** Background worker queues automatically process saved items via Gemini, Cohere, or Mistral models depending on the required task (tagging, summarizing, or embedding).
- **Chrome Extension Sync:** Capture content from anywhere on the internet directly into your workspace with a single click.
- **Flash-Card Memory Resurfacing:** The system intelligently brings up older, forgotten "Hidden Gems" from your library based on spaced repetition and viewing habits.
- **Distraction-Free Workspace:** A rich-text note-taking canvas built on Editor.js that auto-links entities as you type.

---

## 🛠️ The Technology Stack

**Frontend:**
- React 18, Vite, React Router DOM
- Custom CSS / SCSS (Minimalist, scroll-free UX architecture)
- Zustand (State Management)
- Framer Motion (Micro-animations)

**Backend & Architecture:**
- Node.js & Express.js
- MongoDB / Mongoose (Aggregations, Compound Indexes)
- Redis Cloud (Upstash) -> BullMQ (Asynchronous Task Queues)
- Cheerio & YouTube Data API (Web Scraping / Data parsing)

**AI & Embeddings:**
- @google/generative-ai (Gemini)
- @cohere/ai (Cohere API for embeddings and clustering)

---

## 🌊 Application Flow & Architecture

1. **Information Capture:**
   The user saves an item (a URL, text snippet, or Note) via the Web Dashboard or Chrome Extension. 
2. **Immediate Feedback:**
   The system saves the raw metadata into MongoDB instantly for a fast UI response.
3. **Background AI Processing (The Magic):**
   A Redis/BullMQ task is dispatched. In the background, the application routes the content to standard LLMs which read the content, generate summary semantic tags, determine a topic cluster, and compute mathematical embeddings without blocking the user's workflow.
4. **Graph Linking:**
   The backend scans the new entity's tags against the entire library using an `O(n×m)` mapping algorithm to form dynamic connections (Links).
5. **Retrieval:**
   When searching, the application parallelizes requests using `Promise.all()` to rapidly query the local database, fetch live YouTube JSON, and scrape external search engines, consolidating it into a unified UI.

---

## 🔒 Security Highlights

- **Http-Only Cookies for Auth:** Sensitive JWT tokens are **never** stored in `localStorage`. Memora strictly utilizes `httpOnly`, `secure`, and `sameSite` cookies to drastically prevent Cross-Site Scripting (XSS) vulnerabilities.
- **Sanitized Scrapes:** HTML fetched from external websites is strictly sanitized before AI processing or display.
- **In-Memory Attack Mitigation:** JWT verification is cached using an in-memory TTL mechanism to prevent database exhaustion (DDoS protection on auth checks).

---

## 💻 Local Setup (Development)

Memora requires a MongoDB Instance, a Redis server (for queues), and a set of AI API keys.

1. **Clone & Install**
   ```bash
   git clone https://github.com/Deepakdass1326/Memora.git
   cd Memora
   
   # Install backend dependencies
   cd server && npm install
   
   # Install frontend dependencies
   cd ../client && npm install
   ```

2. **Environment Configuration**
   Create a `.env` file in the `/server` directory:
   ```env
   # Example Configuration - Do NOT share real keys
   PORT=5000
   FRONTEND_URL=http://localhost:5173
   
   MONGO_URI=your_mongodb_cluster_string
   REDIS_URL=your_redis_connection_string
   JWT_SECRET=strong_random_secret
   
   GEMINI_API_KEY=your_gemini_key
   COHERE_API_KEY=your_cohere_key
   YOUTUBE_API_KEY=your_yt_key
   ```

3. **Run the Application**
   ```bash
   # Terminal 1: Start the Backend (API + Redis Workers)
   cd server
   npm run dev

   # Terminal 2: Start the Frontend (Vite)
   cd client
   npm run dev
   ```

*(Memora will now be running iteratively on `http://localhost:5173` for the UI and `http://localhost:5000` for the express API.)*

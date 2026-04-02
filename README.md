# 🧠 Memora — Your Second Brain

> Save anything from the web. AI organizes, connects, and resurfaces it for you.

![Memora](https://img.shields.io/badge/Stack-MERN-2D6A4F?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## ✦ Features

| Feature | Description |
|---|---|
| **Save Anything** | Articles, tweets, videos, images, PDFs, notes, links |
| **AI Tagging** | Automatic semantic tag generation from content |
| **Topic Clustering** | Groups items into knowledge domains (tech, design, etc.) |
| **Knowledge Graph** | D3.js interactive visualization of how items connect |
| **Semantic Search** | Full-text search across titles, content, and tags |
| **Memory Resurface** | "2 months ago you saved this..." rediscovery engine |
| **Collections** | Curated folders with emoji + color |
| **Highlights** | Annotate saved content with colored highlights |
| **Related Items** | Automatic cross-linking of related knowledge |

---

## 🗂 Project Structure

```
memora/
├── client/                    # React frontend
│   └── src/
│       ├── components/
│       │   ├── layout/        # Sidebar, Header
│       │   ├── dashboard/     # ItemCard
│       │   ├── graph/         # D3 KnowledgeGraph
│       │   └── save/          # SaveItemModal
│       ├── context/           # AuthContext, ItemsContext
│       ├── hooks/             # Custom hooks
│       ├── pages/             # Dashboard, Library, Graph, Search, Resurface
│       ├── services/          # axios api client
│       └── utils/             # helpers
│
└── server/                    # Express + MongoDB backend
    └── src/
        ├── config/            # database.js
        ├── controllers/       # auth, item, resurface
        ├── middleware/        # auth.middleware.js
        ├── models/            # User, Item, Collection
        ├── routes/            # REST API routes
        ├── services/          # aiTagging.service.js
        └── utils/             # helpers, seed
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Install & Run

```bash
# Clone and install all dependencies
git clone <repo>
cd memora
npm run install:all

# Configure server environment
cp server/.env.example server/.env
# Edit server/.env with your MongoDB URI and JWT secret

# Start both client + server in development
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health check**: http://localhost:5000/api/health

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user |

### Items
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/items` | List items (filter by type, tag, collection) |
| POST | `/api/items` | Save new item (AI tags auto-generated) |
| GET | `/api/items/graph` | Knowledge graph data |
| PUT | `/api/items/:id` | Update item |
| DELETE | `/api/items/:id` | Delete item |
| PATCH | `/api/items/:id/favorite` | Toggle favorite |
| POST | `/api/items/:id/highlights` | Add highlight |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/search?q=` | Full-text search |
| GET | `/api/tags` | All user tags with counts |
| GET | `/api/resurface` | Memory resurfacing groups |
| GET | `/api/collections` | User collections |

---

## 🧩 Tech Stack

**Frontend**
- React 18 + React Router 6
- D3.js v7 — knowledge graph visualization
- Framer Motion — animations
- DM Serif Display + DM Sans + DM Mono — typography system
- CSS custom properties — design tokens

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Rule-based NLP tagging (production: swap for OpenAI embeddings)

**Planned / Production Extensions**
- Vector DB (Pinecone / Weaviate) for semantic embeddings
- OpenAI/Claude API for richer tag suggestions
- Browser extension (Chrome/Firefox) for one-click saving
- Object storage (S3) for thumbnails and PDFs
- BullMQ workers for async processing

---

## 🎨 Design System

- **Font**: DM Serif Display (headings) + DM Sans (body) + DM Mono (code/meta)
- **Color**: Warm off-white base (`#FAFAF8`), forest green accent (`#2D6A4F`)
- **Aesthetic**: Light, minimal, modern — editorial yet functional
- **Radius**: Consistent radius scale from `6px` to `24px`
- **Shadows**: Subtle, layered shadow system

---

## 📄 License

MIT © 2024 Memora

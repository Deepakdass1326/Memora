# 🧠 Memora Architecture & Data Flow

This document details the full architectural flow of the Memora project, covering the frontend, backend, AI integration, and browser extension.

---

## 🏗️ High-Level Architecture

Memora is built on a **MERN** stack (MongoDB, Express, React, Node) with a specialized AI layer for knowledge organization.

- **Client Layer**: React Web App (Vite) and Chrome Extension.
- **API Layer**: Express Server with JWT Authentication, Scraper Service, and AI Tagging.
- **Database Layer**: MongoDB Atlas for Users, Items, and Collection management.

---

## 🔄 Core Data Flows

### 1. Saving a New Item (The Lifecycle)
When a user saves a URL via the Web App or the Chrome Extension:

1.  **Ingestion**: URL is sent to `POST /api/items`.
2.  **Scraping**: The server uses the `Scraper Service` to fetch the page title, description, and metadata.
3.  **AI Analysis**:
    - The `AITagging Service` sends a content snippet to **Gemini 2.5 Flash**.
    - Gemini returns structured JSON containing **Semantic Tags** and a **Topic Cluster** (e.g., technology, design).
    - *Fallback*: If the AI fails, a rule-based keyword extractor takes over.
4.  **Persistence**: The item is saved to MongoDB with its AI-generated metadata.
5.  **Linking (Async)**: The server searches for other items with similar tags or clusters to create **Related Items** links.

### 2. Knowledge Graph Generation
The Knowledge Graph (`/api/items/graph`) uses a hybrid logic:

-   **Nodes**: Represent saved items, sized by their "connectedness."
-   **Explicit Links**: Created from the `relatedItems` field generated during the AI step.
-   **Implicit Links**: Created dynamically if two items share more than 2-3 identical tags.
-   **Rendering**: The frontend uses **D3.js** with a force-directed simulation to layout the nodes.

### 3. Memory Resurfacing (The "Second Brain" Engine)
The resurfacing logic (`/api/resurface`) uses a tiered interval algorithm:

-   **Spaced Repetition**: Fetches items created exactly 14 days, 30 days, 90 days, and 365 days ago (± 3 days).
-   **Hidden Gems**: Finds high-quality items saved >3 months ago that the user hasn't interacted with recently.
-   **Fallback**: Shows most recent items if no intervals match.

---

## 🛠️ Component Breakdown

### Frontend (client/)
-   **State Management**: React Context (`AuthContext`, `ItemsContext`) for global state.
-   **Styling**: 
    - **SCSS Modern Compiler**: Modular styles.
    - **Theme System**: Utilizes CSS variables defined in `_variables.scss` for Light/Dark mode support.
-   **Visualization**: D3.js for the Knowledge Graph and Framer Motion for UI transitions.

### Backend (server/)
-   **Auth**: JWT stored in `localStorage` and sent via `Authorization: Bearer` header.
-   **AI Layer**: 
    - **LangChain**: Used to orchestrate the prompt flow to Gemini.
    - **Prompt Engineering**: System instructions force Gemini to return valid JSON with specific knowledge domains.
-   **Security**: `express-rate-limit` prevents API abuse.

### Extension (extension/)
-   **Popup Logic**: Captures `tab.url` and `tab.title`.
-   **Auth Bridge**: Reads the `memora_token` from `chrome.storage.local`. (The web app syncs the token to the extension storage upon login).

---

## 🗄️ Database Schema (Simplified)

### Item Model
- `user`: Reference (User)
- `url`: String (Unique-ish)
- `type`: Enum (Article, Video, Tweet, etc.)
- `tags`: Array[String] (Indexed)
- `topicCluster`: String (technology, design, etc.)
- `relatedItems`: Array[Reference (Item)]
- `resurfaceCount`: Number (Tracking for "Hidden Gems")

---

> [!NOTE]
> The beauty of this architecture lies in the **AI-first approach** to metadata. By offloading categorization to Gemini, the user spends zero time organizing, while the system builds a rich, linked knowledge base automatically.

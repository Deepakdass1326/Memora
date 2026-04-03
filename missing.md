# Memora: Development Roadmap & Refinements

Based on the Product Software Requirements Specification (`productsrs.md`) and the current state of the codebase, here is a detailed breakdown of the features left to build and the technical refinements needed to make Memora a powerful, modern "Second Brain".

---

## 🚀 1. Missing Core Features

### The Browser Extension (Quick Saving)
- **What is missing:** There is currently no way to quickly save content. 
- **What we need to build:** A lightweight browser extension (Chrome/Firefox) that runs a background script. Upon clicking, it should extract the current tab's URL, page title, and main text body, and `POST` it directly to our backend `/api/items` endpoint.

### AI-Based Tagging & Topic Clustering
- **What is missing:** The database has arrays for `tags` and `topicCluster`, but relies on manual input.
- **What we need to build:** An automated pipeline that triggers right after an item is saved. It will read the content and accurately extract relevant metadata without user intervention.

### Semantic Search (Search by Meaning)
- **What is missing:** The current `/api/search` uses basic MongoDB `$text` search, which only matches exact keyword overlaps.
- **What we need to build:** A Vector Database setup (using MongoDB Atlas Vector Search, Pinecone, etc.). Every time an item is saved, its text gets turned into an embedding. When a user searches, their query is also turned into an embedding, allowing us to query via *cosine similarity* (e.g., searching "how to run faster" will bring up articles tagged "sprints" and "cardio").

### Recommending Related Content
- **What is missing:** Items are isolated right now beyond their manually shared generic tags.
- **What we need to build:** Utilizing the Semantic Search infrastructure, we will dynamically query the vector database for items with similar embeddings to the current item being viewed to populate the "Connections" and "Related Items" UI.

---

## 🧠 2. The AI Architecture (LangChain + Gemini)

To implement the AI Tagging and Semantic Search perfectly and affordably, we will adopt the following tech stack inside the Node.js backend:

1. **Google Gemini (`@langchain/google-genai`):** Used for both fast Text Embeddings (`text-embedding-004`) and JSON Tag/Category extraction (`gemini-2.5-flash`).
2. **LangChain (Node.js):** The backend framework that chains together our logic: `[Web Page Scrape] -> [Prompt Template] -> [Gemini LLM] -> [JSON Output Parser]`. This ensures the LLM's raw text response safely matches our database schema requirements.
3. **LangGraph (For Complex Tasks):** For difficult content like long PDFs or heavy web pages, we can build an agentic workflow that reads documents in "chunks", recursively summarizing them before finalizing the `topicCluster`.

---

## ✨ 3. Application Refinements (UI & Stability)

To make the app feel incredibly premium, we should handle these refinements:

- **Highlight System Implementation:** The database Schema already has support for `highlights` and `notes`. We should create a built-in reading view on the frontend that allows users to physically highlight text and store the color/coordinates.
- **D3.js Graph Optimizations:** As your knowledge graph grows to 500+ items, the current physics simulation might struggle. We should implement graph clustering (grouping off-screen nodes into one macro-node), limit initial pull queries, and refine collision boundaries so it renders fluidly.
- **Automated Metadata Scraping:** When sending a raw URL from the extension, the backend should intelligently fetch OpenGraph data (the thumbnail image, author snippet, description) to make the frontend Dashboard look highly polished like Pinterest.
- **Rate Limiting & Error Handling:** Before deploying the AI pipelines, applying strict rate limiting and retries on LLM endpoints to prevent failures and control API costs.

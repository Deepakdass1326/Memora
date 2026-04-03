# 🗺️ Memora Project File Mapping & Internal Flow

This document provides a detailed breakdown of the internal file structure of the Memora project. It explains **what each file does** and **how things are connected** to each other to make the application function.

---

## 🏗️ High-Level Interaction (How Things Connect)

The app consists of three main parts:
1. **Frontend (`client/`)**: A React (Vite) application that the user interacts with.
2. **Backend Engine (`server/`)**: An Express Server that connects to the database, handles business logic, implements AI endpoints, and routes data.
3. **Database**: A MongoDB instance storing user and item data.

**The Typical Flow Request:**
- **User clicks "Save Link"** in the Frontend (`client/.../Dashboard.jsx`).
- The action triggers an API request to the backend (`server/src/routes/item.routes.js`).
- The router passes the request to the designated controller (`server/src/controllers/item.controller.js`).
- The controller coordinates with services. E.g., it asks the scraper service to read the URL and the AI router/tagging service to summarize it.
- After processing, the metadata is saved via the Mongoose Models (`server/src/models/Item.model.js`).
- The controller responds to the Frontend, which then updates the UI.

---

## 🗂️ Backend Breakdown (`server/src/`)

### 1. **Routes (`server/src/routes/`)**
*What they do*: These files define the API endpoints (URLs) and direct incoming HTTP requests (GET, POST, etc.) to the correct Controller.

- **`ai.routes.js`**: Handles AI-specific requests, such as triggering an on-demand AI tag generation or summary.
- **`auth.routes.js`**: Endpoints for logging in, registering, and staying authenticated.
- **`collection.routes.js`, `workspace.routes.js`**: Routes for organizing items into specific folders/workspaces.
- **`item.routes.js`**: Endpoints related to saving, deleting, and fetching items/bookmarks.
- **`note.routes.js`**: Handles user's text notes.
- **`resurface.routes.js`**: Manages the "Memory Resurfacing" algorithm (bringing back old saved links based on spaced repetition).
- **`search.routes.js`**: Handles full-text search requests.
- **`tag.routes.js`**: Handles fetching tags across items for sidebar navigation or tag clouds.

### 2. **Controllers (`server/src/controllers/`)**
*What they do*: The actual logic that processes a route's request. They validate input, call Services for complex tasks, and talk to Models to update the database.

- **`ai.controller.js`**: Manages AI tasks, passing user input to AI Services.
- **`auth.controller.js`**: Handles parsing login data, checking passwords, and issuing JWT tokens.
- **`item.controller.js`**: The heaviest controller. It coordinates adding a new item, retrieving existing data, etc. Check this file to see how items enter the Database.
- **`note.controller.js`**: Logic for reading/writing personal notes.
- **`resurface.controller.js`**: Contains algorithm logic deciding *which* old items to show the user today.
- **`workspace.controller.js`**: Workspace creation and update logic.

### 3. **Services (`server/src/services/`)**
*What they do*: Specialized, reusable chunks of code that handle complex third-party API interactions or heavy logic. Kept separate from Controllers to keep code clean.

- **`aiRouter.service.js`**: Acts as a traffic cop, routing AI tasks to the cheapest/fastest LLM model (e.g., Gemini vs. Mistral vs. Cohere) depending on the task's complexity.
- **`aiTagging.service.js` & `embedding.service.js`**: Talk directly to the AI APIs to analyze content. They automatically tag and categorize links the user saves.
- **`aiGeneration.service.js`**: Helps generate content, summaries, or metadata using AI.
- **`scraper.service.js`**: Connects to the internet to visit a submitted URL, fetch the HTML title, image, and text.

### 4. **Models (`server/src/models/`)**
*What they do*: Defines the Database Schema (what standard shape data must take) using Mongoose for MongoDB.

- **`Item.model.js`**: Defines the blueprint for saved links/articles (contains fields like `url`, `tags`, `topicCluster`).
- **`User.model.js`**: Securely holds user logic (e.g., hashed password).
- **`Note.model.js`**, **`Collection.model.js`**, **`Workspace.model.js`**: Schemas representing user grouping mechanisms.

### 5. **Core Config & Connection**
- **`server/src/index.js`**: The entry point for the backend. It brings everything together. It wires up middleware, starts the Express server, connects to MongoDB, and registers the routes.

---

## 💻 Frontend Breakdown (`client/src/`)

### 1. **Pages (`client/src/pages/`)**
*What they do*: High-level components acting like complete screen views.

- **`AuthPage.jsx`**: The login and registration screen.
- **`Dashboard.jsx`**: The main page where users see their recently saved items.
- **`GraphPage.jsx`**: A special page used to visualize how tags and items relate as a visual web (utilizing the D3.js library).
- **`Search.jsx`**: The interface that queries the backend for items.
- **`Resurface.jsx`**: The user interface connecting to the backend's "Resurface" logic, showing older memories.
- **`ItemDetail.jsx`, `WorkspaceDetail.jsx`, `Library.jsx`**: Detailed views for specific data objects.

### 2. **Components (`client/src/components/`)**
*What they do*: Smaller, reusable UI parts (buttons, layout wrappers, specific interactive sections) imported by the Pages.

- **`layout/`**: Wrapper UI like Sidebar, Header, and standard structure elements.
- **`dashboard/`**: Specific components meant only for the Dashboard page (e.g., `ItemCard`).
- **`graph/`**: Holds internal D3 implementation components that draw the nodes/links for `GraphPage`.
- **`save/`**: Logic and modal components that handle taking in a URL and hitting the API.
- **`ui/`**: General reusable form buttons or base elements.

### 3. **State Management / Context (`client/src/context/`)**
*What they do*: Provides widespread, globally available data variables to any Frontend component that needs it, stopping "prop drilling".

- **`AuthContext.jsx`**: Tracks if a user is currently logged in, holding the JWT and user data.
- **`ItemsContext.jsx`**: Holds local states of all loaded items, so pages don't need to ping the backend constantly for the same links.
- **`ThemeContext.jsx`**: Remembers light/dark mode preferences.
- **`WorkspacesContext.jsx`**: Keep track of the selected or available user workspaces.

### 4. **Entry Point**
- **`App.jsx`**: The router shell of the frontend. It wraps the app in the Context providers and sets up the routing (defining which URL path loads which Page component).

---

## 🔗 The AI Tagging Flow (Detailed Connection Example)

Here is a step-by-step example of how these files relate when checking a URL:

1. **Client interaction**: The user submits a URL in a component inside `client/src/components/save/`.
2. **Client Request**: It uses `axios` to make a POST to `/api/items`.
3. **Route**: `server/src/routes/item.routes.js` catches `/api/items` and directs it to `itemController.createItem`.
4. **Scraper**: `createItem` in `item.controller.js` pauses to run `scraper.service.js` which fetches the web page contents.
5. **AI Routing**: The controller then calls `aiRouter.service.js` to intelligently analyze the content and returns smart tags like "Frontend, React, Tooling".
6. **Data Storage**: A new record based on `Item.model.js` is created and stored in the database.
7. **Response**: A Success signal + the new Item's data is sent back to the Client.
8. **Client Update**: The `ItemsContext.jsx` catches the new item, updating the user's screen in `Dashboard.jsx`.

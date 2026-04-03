# Memora Deployment Guide

This guide provides the exact step-by-step process for deploying the full Memora ecosystem (Frontend, Backend, and Chrome Extension) to live production environments.

## 1. Deploy the Backend (Render.com)

Render is used to host our Node.js/Express API.

1. Create a free account at [Render.com](https://render.com/) and connect your GitHub account.
2. Click **New +** in the top right and select **Web Service**.
3. Select the `Memora` repository.
4. Configure the service:
   - **Name**: `memora-backend` (or similar)
   - **Root Directory**: `server` 
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js` (or `npm start`)
5. Open the **Environment Variables** section and copy all variables from your local `server/.env` file. These include:
   - `MONGO_URI`
   - `JWT_SECRET`
   - `GEMINI_API_KEY`
   - `CLIENT_URL` *(set this to something temporary like `https://temp.vercel.app` until Vercel gives you your real link)*
6. Click **Create Web Service**. 
7. **Save the generated URL** (e.g., `https://memora-backend.onrender.com`). You will need this for the Frontend and the Extension.

---

## 2. Deploy the Frontend (Vercel.com)

Vercel is used to host our React/Vite client application.

1. Create an account at [Vercel.com](https://vercel.com/) and connect your GitHub account.
2. Click **Add New Project** and import your `Memora` repository.
3. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click "Edit" and choose the `client` folder.
4. Open the **Environment Variables** section and add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://memora-backend.onrender.com/api` *(use the exact URL Render gave you in Step 1)*
5. Click **Deploy**. 
6. **Save the generated URL** (e.g., `https://memora.vercel.app`).

---

## 3. Secure the Connection (CORS)

Now that Vercel has generated your permanent Frontend URL, we need to tell the backend to trust it.

1. Go back to your [Render.com Dashboard](https://dashboard.render.com).
2. Open your `memora-backend` Web Service.
3. Go to the **Environment** tab.
4. Update the `CLIENT_URL` to your exact Vercel link (`https://memora.vercel.app`).
5. **Save Changes**. Render will automatically restart your service with the new secure CORS policy.

---

## 4. Configure the Chrome Extension

To sync the extension with the live backend, we must update its URLs and permissions.

1. Open your local project code in VS Code.
2. Navigate to the `extension/` folder.
3. Do a **Project-Wide Search** within the `extension/` folder for `http://localhost:5000` and replace it entirely with your new Render URL (`https://memora-backend.onrender.com`). Pay special attention to:
   - `background.js`
   - `popup.js`
4. Open the `extension/manifest.json` file.
5. In the `host_permissions` array, add the exact Render backend URL so that Chrome will automatically attach the secure cookies. It should look like this:
   ```json
   "host_permissions": [
     "https://memora-backend.onrender.com/*",
     "<all_urls>"
   ]
   ```
6. Save all changed files in the extension folder.

---

## 5. Load the Live Extension

1. In Chrome, type `chrome://extensions` in the address bar.
2. Toggle on **Developer Mode** in the top right corner.
3. Click **Load Unpacked** in the top left.
4. Select your local `Memora/extension` folder.
5. Log into your live Vercel web app—the extension will now seamlessly recognize your user cookie and talk to the live internet databases!

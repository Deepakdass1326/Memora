# Memora — Scale-Up Implementation Guide

Ye document un 3 cheez ka plan hai jo abhi partial hain:
1. **Object Storage (S3)** — File uploads ke liye
2. **Dedicated Vector DB (Pinecone)** — Production-grade semantic search
3. **Queue Workers (BullMQ)** — Async AI processing

---

## 1. 🖼️ Object Storage — ImageKit.io

### Why ImageKit?
- **Free Tier**: 20GB storage, 20GB bandwidth/month
- **Built-in CDN** — Global fast delivery
- **Image Transformations** — Resize, compress, crop on-the-fly via URL
- **Simple SDK** — Much easier than S3

### Architecture

```
User uploads file (image/PDF)
      ↓
Client sends to → POST /api/items/upload
      ↓
Server: multer (memory) → imagekit.upload()
      ↓
ImageKit returns { url, fileId, thumbnailUrl }
      ↓
URL saved in Item.url + Item.thumbnail
```

### Implementation Steps

#### Backend
```bash
npm install imagekit multer
```

**`server/src/services/storage.service.js`** (new file)
```js
const ImageKit = require('imagekit');

const imagekit = new ImageKit({
  publicKey:  process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT, // e.g. https://ik.imagekit.io/your_id
});

const uploadToImageKit = async (fileBuffer, fileName, folder = 'memora') => {
  const response = await imagekit.upload({
    file: fileBuffer.toString('base64'),
    fileName,
    folder,
    useUniqueFileName: true,
    tags: ['memora-upload'],
  });
  return {
    url: response.url,
    fileId: response.fileId,
    thumbnail: response.thumbnailUrl || response.url + '?tr=w-400,h-300,fo-auto',
  };
};

const deleteFromImageKit = async (fileId) => {
  await imagekit.deleteFile(fileId);
};

module.exports = { uploadToImageKit, deleteFromImageKit };
```

**`server/src/routes/item.routes.js`** — add upload route:
```js
const multer = require('multer');
const { uploadToImageKit } = require('../services/storage.service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    const result = await uploadToImageKit(req.file.buffer, req.file.originalname);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
```

#### Frontend (SaveItemModal.jsx)
```jsx
// Add file input
const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/items/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  setForm(prev => ({ ...prev, url: res.data.url, thumbnail: res.data.thumbnail }));
};
```

#### ImageKit Setup
1. [imagekit.io](https://imagekit.io) → Sign Up (free)
2. Dashboard → Developer Options → copy keys

#### Environment Variables (Render)
```
IMAGEKIT_PUBLIC_KEY=public_xxxxxx
IMAGEKIT_PRIVATE_KEY=private_xxxxxx
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id
```

#### Bonus — Auto Image Transformations via URL
```
Original:   https://ik.imagekit.io/your_id/memora/photo.jpg
Thumbnail:  https://ik.imagekit.io/your_id/memora/photo.jpg?tr=w-300,h-200
Compressed: https://ik.imagekit.io/your_id/memora/photo.jpg?tr=q-60
```


---

## 2. 🔍 Vector Database — Pinecone

### Problem (abhi)
- Embeddings MongoDB mein store hain (`embedding: [Number]`)
- Cosine similarity manually calculate hoti hai JS mein (slow at scale)
- 10,000+ items pe slow ho jayega

### Solution
Pinecone dedicated vector DB mein embeddings store karo — milliseconds mein similarity search

### Architecture

```
User saves item
      ↓
Generate embedding (Gemini)
      ↓
Pinecone: upsert({ id, vector, metadata })
      ↓
MongoDB: save item (without embedding)

User searches
      ↓
Query embedding generate karo
      ↓
Pinecone: query({ vector, topK: 20 })  ← instant
      ↓
MongoDB: fetch items by returned IDs
      ↓
Return results
```

### Implementation Steps

#### Setup
```bash
npm install @pinecone-database/pinecone
```

**`server/src/services/vectorDB.service.js`** (new file)
```js
const { Pinecone } = require('@pinecone-database/pinecone');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const index = pc.index(process.env.PINECONE_INDEX); // e.g. 'memora'

// Upsert embedding when item is created/updated
const upsertEmbedding = async (itemId, userId, embedding, metadata) => {
  await index.upsert([{
    id: itemId.toString(),
    values: embedding,
    metadata: { userId: userId.toString(), ...metadata },
  }]);
};

// Search similar items
const querySimilar = async (queryEmbedding, userId, topK = 20) => {
  const result = await index.query({
    vector: queryEmbedding,
    topK,
    filter: { userId: userId.toString() },
    includeMetadata: true,
  });
  return result.matches; // [{ id, score, metadata }]
};

// Delete when item is deleted
const deleteEmbedding = async (itemId) => {
  await index.deleteOne(itemId.toString());
};

module.exports = { upsertEmbedding, querySimilar, deleteEmbedding };
```

#### Migrate search.routes.js
Replace manual cosine similarity ke saath Pinecone query:
```js
const { querySimilar } = require('../services/vectorDB.service');
const { generateEmbedding } = require('../services/embedding.service');

// In GET /api/search
const queryEmbedding = await generateEmbedding(q);
const matches = await querySimilar(queryEmbedding, req.user._id);
const itemIds = matches.map(m => m.id);
const items = await Item.find({ _id: { $in: itemIds } });
// Sort by Pinecone score
```

#### Pinecone Setup
1. [pinecone.io](https://pinecone.io) → Create free account
2. Create Index: `memora`, dimension: `768`, metric: `cosine`
3. Copy API Key

#### Environment Variables (Render)
```
PINECONE_API_KEY=your_key
PINECONE_INDEX=memora
```

---

## 3. ⚡ Queue Workers — BullMQ + Redis

### Problem (abhi)
- Jab item save hota hai, AI tagging **synchronously** hoti hai
- Agar Gemini slow hai → user ko wait karna padta hai
- Agar AI fail ho → item save nahi hota

### Solution
Item **instantly** save ho — AI processing background mein queue se ho

### Architecture

```
User saves item
      ↓
Item saved in MongoDB (tags = [], embedding = [])
      ↓
Response sent to user immediately ✅
      ↓
Background: BullMQ job added to Redis queue
      ↓
Worker processes job:
  1. Generate tags (Gemini/Cohere)
  2. Generate embedding (Gemini)
  3. Upsert to Pinecone
  4. Update MongoDB item
      ↓
Frontend polls or WebSocket notifies user
```

### Implementation Steps

#### Setup
```bash
npm install bullmq ioredis
```

**`server/src/queues/ai.queue.js`** (new file)
```js
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });

// Queue
const aiQueue = new Queue('ai-processing', { connection });

// Worker
const aiWorker = new Worker('ai-processing', async (job) => {
  const { itemId } = job.data;
  const { generateTags } = require('../services/aiTagging.service');
  const { generateEmbedding, buildItemText } = require('../services/embedding.service');
  const { upsertEmbedding } = require('../services/vectorDB.service');
  const Item = require('../models/Item.model');

  const item = await Item.findById(itemId);
  if (!item) return;

  // 1. Generate tags
  const { tags, topicCluster } = await generateTags(item);

  // 2. Generate embedding
  const text = buildItemText({ ...item.toObject(), tags, topicCluster });
  const embedding = await generateEmbedding(text);

  // 3. Upsert to Pinecone
  if (embedding) await upsertEmbedding(itemId, item.user, embedding, { title: item.title });

  // 4. Update MongoDB
  await Item.findByIdAndUpdate(itemId, { tags, topicCluster, embedding });
  console.log(`[Queue] AI processing done for ${itemId}`);

}, { connection });

module.exports = { aiQueue };
```

**In `item.controller.js`** — change save flow:
```js
const { aiQueue } = require('../queues/ai.queue');

// After Item.create(...)
await aiQueue.add('process-item', { itemId: item._id });
// Remove synchronous AI call
```

#### Redis Setup (Free)
1. [Upstash.com](https://upstash.com) → Create free Redis database
2. Copy `REDIS_URL` (format: `rediss://...`)

#### Environment Variables (Render)
```
REDIS_URL=rediss://your_upstash_url
```

---

## 📋 Priority Order to Implement

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 1st | **BullMQ + Redis** | Medium | Instant saves, better UX |
| 2nd | **Pinecone Vector DB** | Medium | Fast search at scale |
| 3rd | **S3 Object Storage** | Low | File upload support |

---

## 💰 Cost Estimate (Free Tiers)

| Service | Free Tier |
|---|---|
| Pinecone | 2GB storage, 1 index |
| Upstash Redis | 10,000 commands/day |
| Cloudflare R2 | 10GB storage, zero egress |
| AWS S3 | 5GB, 20k requests/month |

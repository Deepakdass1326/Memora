const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const { uploadFile } = require('../services/storage.service');

const router = express.Router();

// Memory storage — file is held as Buffer, never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Accepted: jpg, png, webp, gif, pdf'));
    }
  },
});

/**
 * POST /api/upload
 * Upload a file to ImageKit and return the CDN URL + thumbnail
 */
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });

    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'image';
    const { url, fileId, thumbnail } = await uploadFile(req.file.buffer, req.file.originalname, 'memora', fileType);

    res.json({ success: true, url, fileId, thumbnail });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

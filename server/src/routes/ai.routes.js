const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const { generateNote, summarizeNote, formatTranscript } = require('../controllers/ai.controller');

const router = express.Router();

router.use(protect);

// Generate a note from a text prompt
router.post('/generate-note', generateNote);

// Summarize existing note content
router.post('/summarize', summarizeNote);

// Format raw speech transcript into a note
router.post('/format-transcript', formatTranscript);

module.exports = router;

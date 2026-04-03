const { generateNote, summarizeNote, formatTranscript } = require('../services/aiGeneration.service');

// POST /api/ai/generate-note
exports.generateNote = async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt is required' });
    }

    const content = await generateNote(prompt.trim(), context || '');
    res.status(200).json({ success: true, data: { content } });
  } catch (err) {
    console.error('[AI] generateNote error:', err.message);
    res.status(500).json({ success: false, message: 'AI generation failed. Try again.' });
  }
};

// POST /api/ai/summarize
exports.summarizeNote = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Content is required' });
    }

    const plainText = content.replace(/<[^>]*>?/gm, ' ').trim();
    const summary = await summarizeNote(plainText);
    res.status(200).json({ success: true, data: { summary } });
  } catch (err) {
    console.error('[AI] summarizeNote error:', err.message);
    res.status(500).json({ success: false, message: 'Summarization failed. Try again.' });
  }
};

// POST /api/ai/format-transcript
exports.formatTranscript = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const content = await formatTranscript(text.trim());
    res.status(200).json({ success: true, data: { content } });
  } catch (err) {
    console.error('[AI] formatTranscript error:', err.message);
    res.status(500).json({ success: false, message: 'Formatting failed. Try again.' });
  }
};

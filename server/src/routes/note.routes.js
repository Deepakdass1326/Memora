const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth.middleware');
const {
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  getPublicNote,
} = require('../controllers/note.controller');

const router = express.Router();

// Public route for sharing Notes
router.get('/public/:id', getPublicNote);

// Protected routes
router.use(protect);

router.route('/')
  .post(
    [body('workspace', 'Workspace ID is required').notEmpty()],
    createNote
  )
  .get(getNotes);

router.route('/:id')
  .get(getNote)
  .put(updateNote)
  .delete(deleteNote);

module.exports = router;

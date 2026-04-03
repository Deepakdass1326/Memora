const express = require('express');
const { body } = require('express-validator');
const { protect } = require('../middleware/auth.middleware');
const {
  createWorkspace,
  getWorkspaces,
  updateWorkspace,
  deleteWorkspace,
} = require('../controllers/workspace.controller');

const router = express.Router();

router.use(protect); // All routes require auth

router.route('/')
  .post(
    [body('name', 'Name is required').notEmpty()],
    createWorkspace
  )
  .get(getWorkspaces);

router.route('/:id')
  .put(updateWorkspace)
  .delete(deleteWorkspace);

module.exports = router;

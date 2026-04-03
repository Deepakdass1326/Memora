// auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, logout, getMe, updatePreferences } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.put('/preferences', protect, updatePreferences);

module.exports = router;

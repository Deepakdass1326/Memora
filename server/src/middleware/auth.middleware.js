const jwt  = require('jsonwebtoken');
const User = require('../models/User.model');

// ──────────────────────────────────────────────────────────────────────────────
// In-process user cache (30s TTL per user ID)
//
// WHY: The `protect` middleware runs on EVERY authenticated request.
// Without caching, every API call does: jwt.verify() + User.findById() = 1 DB hit.
// Dashboard alone triggers 3 API calls = 3 DB reads just to look up the same user.
// With a 30s TTL cache, repeat calls within the window are served from RAM.
//
// SAFETY: Cache is keyed by decoded userId (from a valid JWT), not by token string.
// If the user updates their password or is deleted, the cache auto-expires in 30s.
// ──────────────────────────────────────────────────────────────────────────────
const USER_CACHE_TTL = 30 * 1000; // 30 seconds
const _userCache     = new Map();  // userId (string) → { user, expiresAt }

const getCachedUser = async (userId) => {
  const cached = _userCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user;
  }
  // Cache miss → fetch from DB
  const user = await User.findById(userId).select('-password');
  if (user) {
    _userCache.set(userId, { user, expiresAt: Date.now() + USER_CACHE_TTL });
  }
  return user;
};

// Auto-purge expired entries every 60 seconds so the Map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of _userCache.entries()) {
    if (now >= val.expiresAt) _userCache.delete(key);
  }
}, 60_000);

const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.memora_token;
    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'memora_secret_key');
    const user    = await getCachedUser(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Call this from auth routes (login, logout, updatePassword) to
// immediately invalidate the cached user so the fresh record is fetched
const invalidateUserCache = (userId) => {
  _userCache.delete(String(userId));
};

module.exports = { protect, invalidateUserCache };

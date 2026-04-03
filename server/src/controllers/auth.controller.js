const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'memora_secret_key', { expiresIn: '30d' });

const setTokenCookie = (res, token) => {
  res.cookie('memora_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
};

// @desc  Register user
// @route POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);
    setTokenCookie(res, token);
    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Login user
// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = generateToken(user._id);
    setTokenCookie(res, token);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Get current user
// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc  Update preferences
// @route PUT /api/auth/preferences
const updatePreferences = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences: req.body },
      { new: true }
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Logout user
// @route POST /api/auth/logout
const logout = async (req, res) => {
  res.clearCookie('memora_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.json({ success: true, message: 'Logged out successfully' });
};

module.exports = { register, login, logout, getMe, updatePreferences };

const express = require('express');
const resurfaceRouter = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { getResurfaceItems } = require('../controllers/resurface.controller');

resurfaceRouter.use(protect);
resurfaceRouter.get('/', getResurfaceItems);

module.exports = resurfaceRouter;

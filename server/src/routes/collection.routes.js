// collection.routes.js
const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection.model');
const Item = require('../models/Item.model');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/', async (req, res) => {
  const collections = await Collection.find({ user: req.user._id }).sort({ name: 1 });
  res.json({ success: true, data: collections });
});

router.post('/', async (req, res) => {
  const col = await Collection.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, data: col });
});

router.put('/:id', async (req, res) => {
  const col = await Collection.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true });
  res.json({ success: true, data: col });
});

router.delete('/:id', async (req, res) => {
  await Collection.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  await Item.updateMany({ collections: req.params.id }, { $pull: { collections: req.params.id } });
  res.json({ success: true, message: 'Collection deleted' });
});

module.exports = router;

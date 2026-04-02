const express = require('express');
const router = express.Router();
const { getItems, createItem, getItem, updateItem, deleteItem, toggleFavorite, addHighlight, getGraphData } = require('../controllers/item.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);

router.get('/graph', getGraphData);
router.route('/').get(getItems).post(createItem);
router.route('/:id').get(getItem).put(updateItem).delete(deleteItem);
router.patch('/:id/favorite', toggleFavorite);
router.post('/:id/highlights', addHighlight);

module.exports = router;

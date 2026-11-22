const express = require('express');
const c = require('../controllers/productController');
const { validateObjectId } = require('../middleware/errorHandler');

const router = express.Router();

// Fixed paths MUST come before "/:id", otherwise "low-stock" is treated as an id
router.get('/low-stock', c.getLowStock);
router.get('/summary', c.getCategorySummary);

router.route('/').get(c.getProducts).post(c.createProduct);

router
  .route('/:id')
  .get(validateObjectId, c.getProductById)
  .put(validateObjectId, c.updateProduct)
  .delete(validateObjectId, c.deleteProduct);

router.patch('/:id/stock', validateObjectId, c.adjustStock);

module.exports = router;

const Product = require('../models/Product');

const httpError = (status, message) => Object.assign(new Error(message), { status });

// POST /api/products
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
};

// GET /api/products?category=&supplier=&search=&minPrice=&maxPrice=&sort=&page=&limit=
exports.getProducts = async (req, res, next) => {
  try {
    const { category, supplier, search, minPrice, maxPrice, sort } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter = {};
    if (category) filter.category = new RegExp(`^${escape(category)}$`, 'i');
    if (supplier) filter.supplier = new RegExp(escape(supplier), 'i');
    if (search) filter.name = new RegExp(escape(search), 'i');
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // sort=-price,name  ->  "-price name"
    const sortBy = sort ? String(sort).split(',').join(' ') : '-createdAt';

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      count: products.length,
      products,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) throw httpError(404, 'Product not found');
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) throw httpError(404, 'Product not found');
    res.json(product);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw httpError(404, 'Product not found');
    res.json({ message: 'Product deleted', id: product.id });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/products/:id/stock   body: { "change": 10 } (restock) or { "change": -3 } (sale)
exports.adjustStock = async (req, res, next) => {
  try {
    const change = req.body.change;
    if (typeof change !== 'number' || !Number.isInteger(change) || change === 0) {
      throw httpError(400, '"change" must be a non-zero integer');
    }

    // Atomic update: for a sale, only match if enough stock exists
    const filter = { _id: req.params.id };
    if (change < 0) filter.quantity = { $gte: -change };

    const product = await Product.findOneAndUpdate(
      filter,
      { $inc: { quantity: change } },
      { new: true, runValidators: true }
    );

    if (!product) {
      const exists = await Product.exists({ _id: req.params.id });
      throw exists ? httpError(400, 'Insufficient stock for this sale') : httpError(404, 'Product not found');
    }

    res.json({ message: 'Stock updated', product });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/low-stock   (quantity <= reorderLevel)
exports.getLowStock = async (req, res, next) => {
  try {
    const lowStockItems = await Product.find({
      $expr: { $lte: ['$quantity', '$reorderLevel'] },
    }).sort('quantity');

    res.json({ count: lowStockItems.length, lowStockItems });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/summary   (category-wise aggregation)
exports.getCategorySummary = async (req, res, next) => {
  try {
    const summary = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalItems: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
          avgPrice: { $avg: '$price' },
        },
      },
      { $sort: { totalStockValue: -1 } },
    ]);

    res.json({ categories: summary.length, summary });
  } catch (err) {
    next(err);
  }
};

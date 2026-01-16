const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const authMiddleware = require("../middlewares/authMiddleware");

// @route   POST /api/products/add
// @desc    Add a new bulk product with tiered pricing
router.post("/add", authMiddleware, productController.addProduct);

// @route   GET /api/products/user
// @desc    Get all products belonging to the logged-in user
router.get("/user", authMiddleware, productController.getUserProducts);

module.exports = router;

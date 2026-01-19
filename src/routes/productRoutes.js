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

// @route   DELETE /api/products/delete/:productId
// @desc    Delete product and its associated media
router.delete(
  "/delete/:productId",
  authMiddleware,
  productController.deleteProduct,
);

// @route   PUT /api/products/update/:productId
router.put(
  "/update/:productId",
  authMiddleware,
  productController.updateProduct,
);

router.get(
  "/user-dashboard",
  authMiddleware,
  productController.getUserDashboard,
);

router.put(
  "/order/complete/:orderId",
  authMiddleware,
  productController.completeOrder,
);

module.exports = router;

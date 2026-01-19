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

router.get("/marketplace", productController.getMarketplace);
router.get("/details/:id", productController.getProductDetails);

// @route   POST /api/products/order/initiate
// @desc    Initiate a wholesale deal and create a pending order
router.post("/order/initiate", authMiddleware, productController.initiateOrder);

// @route   GET /api/products/reviews/:productId
// @desc    Get all reviews and calculated stats for a specific product
router.get("/reviews/:productId", productController.getProductReviews);

// @route   POST /api/products/review/add
// @desc    Add or update a review (Requires authentication)
router.post("/review/add", authMiddleware, productController.addReview);

// @route   DELETE /api/products/review/delete/:productId
router.delete(
  "/review/delete/:productId",
  authMiddleware,
  productController.deleteReview,
);

module.exports = router;

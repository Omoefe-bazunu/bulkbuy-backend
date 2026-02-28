const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");

// @route   POST /api/orders/checkout
// Places a new order from cart items
router.post("/checkout", authMiddleware, orderController.checkout);

// @route   GET /api/orders/my-orders
// Retrieves purchase history for the logged-in user
router.get("/my-orders", authMiddleware, orderController.getMyOrders);

// @route   PATCH /api/orders/status/:orderId
// Updates status of a specific order
router.patch(
  "/status/:orderId",
  authMiddleware,
  orderController.updateOrderStatus,
);

module.exports = router;

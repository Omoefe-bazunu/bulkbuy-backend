const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middleware/auth");

// @route   GET /api/orders/my-chats
// @desc    Get all active negotiations for the logged-in user (Inbox)
router.get("/my-chats", authMiddleware, orderController.getMyChats);

// @route   GET /api/orders/messages/:orderId
// @desc    Get message history for a specific deal
router.get(
  "/messages/:orderId",
  authMiddleware,
  orderController.getChatMessages,
);

// @route   PATCH /api/orders/status/:orderId
// @desc    Update order status (e.g., from 'pending' to 'completed')
router.patch(
  "/status/:orderId",
  authMiddleware,
  orderController.updateOrderStatus,
);

module.exports = router;

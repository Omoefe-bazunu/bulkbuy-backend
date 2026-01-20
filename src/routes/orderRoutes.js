const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
// Updated path to match your folder and filename
const authMiddleware = require("../middlewares/authMiddleware");

// @route   GET /api/orders/my-chats
router.get("/my-chats", authMiddleware, orderController.getMyChats);

// @route   GET /api/orders/messages/:orderId
router.get(
  "/messages/:orderId",
  authMiddleware,
  orderController.getChatMessages,
);

// @route   PATCH /api/orders/status/:orderId
router.patch(
  "/status/:orderId",
  authMiddleware,
  orderController.updateOrderStatus,
);

module.exports = router;

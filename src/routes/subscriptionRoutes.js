const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const authMiddleware = require("../middlewares/authMiddleware");

// @route   POST /api/subscriptions/submit
router.post(
  "/submit",
  authMiddleware,
  subscriptionController.submitSubscription
);

// @route   GET /api/subscriptions/status
router.get(
  "/status",
  authMiddleware,
  subscriptionController.getSubscriptionStatus
);

module.exports = router;

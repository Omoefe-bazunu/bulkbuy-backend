const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");

// Security: Verify Admin Email
const isAdmin = (req, res, next) => {
  if (req.user && req.user.email === "info@higher.com.ng") next();
  else res.status(403).json({ message: "Unauthorized access" });
};

router.use(authMiddleware, isAdmin);

// KYC Endpoints
router.get("/kyc/pending", adminController.getPendingKYC);
router.post("/kyc/update", adminController.updateKYCStatus);

// Subscription Endpoints
router.get("/subscriptions/pending", adminController.getPendingSubscriptions);
router.post("/subscriptions/update", adminController.updateSubscriptionStatus);

// User Management
router.get("/users", adminController.getAllUsers);

module.exports = router;

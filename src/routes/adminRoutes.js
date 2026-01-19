const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middlewares/authMiddleware");

// Helper: Simple Role Check
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") next();
  else res.status(403).json({ message: "Access denied. Admins only." });
};

router.use(authMiddleware, isAdmin);

router.get("/kyc/pending", adminController.getPendingKYC);
router.post("/kyc/update", adminController.updateKYCStatus);
router.get("/subscriptions/pending", adminController.getPendingSubscriptions);
router.post("/subscriptions/update", adminController.updateSubscriptionStatus);
router.get("/users", adminController.getAllUsers);

module.exports = router;

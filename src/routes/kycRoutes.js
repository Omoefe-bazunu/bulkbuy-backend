const express = require("express");
const router = express.Router();
const kycController = require("../controllers/kycController");
const authMiddleware = require("../middlewares/authMiddleware");

// @route   POST /api/kyc/submit-kyc
// @desc    Submit NIN, BVN, and CAC documents for verification
// @access  Private (Requires Auth Token)
router.post("/submit-kyc", authMiddleware, kycController.submitKYC);

module.exports = router;

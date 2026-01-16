const express = require("express");
const router = express.Router();
const kycController = require("../controllers/kycController");
const authMiddleware = require("../middlewares/authMiddleware");

// @route   POST /api/kyc/submit-kyc
// @desc    Submit NIN, BVN, and CAC documents for verification
router.post("/submit-kyc", authMiddleware, kycController.submitKYC);

// @route   GET /api/kyc/status
// @desc    Check current user's KYC verification status
router.get("/status", authMiddleware, kycController.getKYCStatus);

module.exports = router;

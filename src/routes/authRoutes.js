const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// Public Routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Forgot & Reset Password Routes (Add these!)
// If these are missing or misspelled in authController.js, Render will crash
router.post("/forgot-password", authController.forgotPassword);
router.put("/reset-password/:token", authController.resetPassword);

// Protected Route
router.get("/profile", authMiddleware, authController.getProfile);

module.exports = router;

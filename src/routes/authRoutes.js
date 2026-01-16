const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware"); // Import the Gatekeeper

// Public Routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);

// Protected Route: Get User Profile
// Notice how 'authMiddleware' is placed BEFORE the controller logic
router.get("/profile", authMiddleware, authController.getProfile);

module.exports = router;

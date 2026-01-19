require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { db } = require("./config/firebase");
const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const productRoutes = require("./routes/productRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

// Middleware to parse JSON bodies
app.use(express.json());

// --- ROUTES ---

// Auth Routes (Signup & Login)
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/products", productRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

// Test Route to check API health
app.get("/", (req, res) => {
  res.send("BulkBuy API is running smoothly... 🚀");
});

// --- ERROR HANDLING ---

// 404 Handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 BulkBuy Server live on port ${PORT}`);
});

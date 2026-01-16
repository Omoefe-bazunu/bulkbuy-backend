const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "bulkbuy_ultra_secret_2026";

module.exports = (req, res, next) => {
  // 1. Get token from header (Format: Bearer <token>)
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 3. Attach user info (id and email) to the request object
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

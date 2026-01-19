const { db, admin } = require("../config/firebase");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Resend } = require("resend");

const JWT_SECRET =
  process.env.JWT_SECRET || "BULKBUY_SECRET_KEY_004455667788901";
const resend = new Resend(process.env.RESEND_API_KEY);

// --- ORIGINAL AUTH LOGIC ---

exports.signup = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password } = req.body;
    if (!fullName || !email || !phoneNumber || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const userRef = db.collection("users");
    const snapshot = await userRef
      .where("email", "==", email.toLowerCase())
      .get();

    if (!snapshot.empty)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      fullName,
      email: email.toLowerCase(),
      phoneNumber,
      password: hashedPassword,
      role: "buyer",
      status: "unverified",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await userRef.add(newUser);
    const token = jwt.sign(
      { id: docRef.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: docRef.id,
        fullName,
        email,
        role: "buyer",
        status: "unverified",
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const userRef = db.collection("users");
    const snapshot = await userRef
      .where("email", "==", email.toLowerCase())
      .get();

    if (snapshot.empty)
      return res.status(404).json({ message: "User not found" });

    let userDoc;
    snapshot.forEach((doc) => {
      userDoc = { id: doc.id, ...doc.data() };
    });

    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: userDoc.id, email: userDoc.email },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: userDoc.id,
        fullName: userDoc.fullName,
        email: userDoc.email,
        role: userDoc.role,
        status: userDoc.status,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists)
      return res.status(404).json({ message: "User not found" });

    const userData = userDoc.data();
    delete userData.password;
    res.status(200).json({ id: userDoc.id, ...userData });
  } catch (error) {
    console.error("Profile Error:", error);
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// --- PASSWORD RESET LOGIC ---

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const userRef = db.collection("users");
    const snapshot = await userRef
      .where("email", "==", email.toLowerCase())
      .get();

    if (snapshot.empty)
      return res
        .status(404)
        .json({ message: "User with this email does not exist" });

    let userId, userData;
    snapshot.forEach((doc) => {
      userId = doc.id;
      userData = doc.data();
    });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const tokenExpiry = Date.now() + 3600000;

    await userRef.doc(userId).update({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: tokenExpiry,
    });

    const resetUrl = `bulkbuy://reset-password?token=${resetToken}`;

    await resend.emails.send({
      from: "BulkBuy <auth@bulkbuy.com.ng>",
      to: [email.toLowerCase()],
      subject: "Reset Your BulkBuy Password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #001226;">
          <h2 style="color: #003366;">Password Reset Request</h2>
          <p>Hello ${userData.fullName},</p>
          <p>You requested to reset your password. Click the button below to continue:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #00A86B; color: #fff; padding: 12px 25px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0;">Reset Password</a>
          <p style="font-size: 12px; color: #6B7280;">If you didn't request this, please ignore this email. The link will expire in 1 hour.</p>
        </div>
      `,
    });

    res.status(200).json({ message: "Reset link sent to your email" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ message: "Error sending reset email" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "New password is required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const userRef = db.collection("users");
    const snapshot = await userRef
      .where("resetPasswordToken", "==", hashedToken)
      .where("resetPasswordExpires", ">", Date.now())
      .get();

    if (snapshot.empty)
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });

    let userId;
    snapshot.forEach((doc) => {
      userId = doc.id;
    });

    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(password, salt);

    await userRef.doc(userId).update({
      password: newHashedPassword,
      resetPasswordToken: admin.firestore.FieldValue.delete(),
      resetPasswordExpires: admin.firestore.FieldValue.delete(),
    });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ message: "Server error during password reset" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists)
      return res.status(404).json({ message: "User not found" });

    const userData = userDoc.data();
    delete userData.password; // Remove sensitive data [cite: 95]

    // Ensure the specific fields you need are included
    res.status(200).json({
      id: userDoc.id,
      ...userData,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

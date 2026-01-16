const crypto = require("crypto");
const { Resend } = require("resend");

// Initialize Resend with your API Key from Render Environment Variables
const resend = new Resend(process.env.RESEND_API_KEY);

// FORGOT PASSWORD LOGIC
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const userRef = db.collection("users");
    const snapshot = await userRef
      .where("email", "==", email.toLowerCase())
      .get();

    if (snapshot.empty) {
      return res
        .status(404)
        .json({ message: "User with this email does not exist" });
    }

    let userId;
    let userData;
    snapshot.forEach((doc) => {
      userId = doc.id;
      userData = doc.data();
    });

    // 1. Generate Reset Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // 2. Set Expiry (1 Hour from now)
    const tokenExpiry = Date.now() + 3600000;

    // 3. Update Firestore Document
    await userRef.doc(userId).update({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: tokenExpiry,
    });

    // 4. Send Email via Resend
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

// RESET PASSWORD LOGIC (ACTUAL UPDATE)
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password)
      return res.status(400).json({ message: "New password is required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token and unexpired time
    const userRef = db.collection("users");
    const snapshot = await userRef
      .where("resetPasswordToken", "==", hashedToken)
      .where("resetPasswordExpires", ">", Date.now())
      .get();

    if (snapshot.empty) {
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });
    }

    let userId;
    snapshot.forEach((doc) => {
      userId = doc.id;
    });

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset fields
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

const { db, admin } = require("../config/firebase");

// --- SUBMIT KYC ---
exports.submitKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nin, bvn, passportUrl } = req.body;

    // 1. Validation (CAC removed)
    if (!nin || !bvn || !passportUrl) {
      return res
        .status(400)
        .json({ message: "NIN, BVN, and Passport ID are required." });
    }

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists)
      return res.status(404).json({ message: "Account not found." });

    const userData = userDoc.data();

    // 2. Status Guard
    if (userData.status === "pending") {
      return res
        .status(400)
        .json({ message: "Verification is already pending." });
    }
    if (userData.status === "verified") {
      return res.status(400).json({ message: "Account is already verified." });
    }

    // 3. Update User
    await userRef.update({
      status: "pending",
      kycData: {
        nin,
        bvn,
        passportUrl,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      kycUpdateHistory: admin.firestore.FieldValue.arrayUnion({
        action: "submitted",
        timestamp: new Date().toISOString(),
      }),
    });

    res.status(200).json({
      success: true,
      message: "KYC documents submitted. Our team will review shortly.",
    });
  } catch (error) {
    console.error("KYC Submit Error:", error);
    res
      .status(500)
      .json({ message: "Submission failed. Please try again later." });
  }
};

// --- GET KYC STATUS ---
exports.getKYCStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const userData = userDoc.data();

    // Return only the status to the frontend
    res.status(200).json({
      status: userData.status || "unverified",
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching status." });
  }
};

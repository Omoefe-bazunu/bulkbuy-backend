const { db, admin } = require("../config/firebase");

exports.submitKYC = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nin, bvn, passportUrl, cacUrl, statusReportUrl } = req.body;

    // 1. Basic Validation: Ensure all required fields exist
    if (!nin || !bvn || !passportUrl || !cacUrl || !statusReportUrl) {
      return res.status(400).json({
        message: "Missing required KYC documents or information.",
      });
    }

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const userData = userDoc.data();

    // 2. Prevent resubmission if already pending or verified
    if (userData.status === "pending") {
      return res.status(400).json({
        message: "Your verification is already being reviewed.",
      });
    }

    if (userData.status === "verified" || userData.status === "approved") {
      return res.status(400).json({
        message: "Your account is already verified.",
      });
    }

    // 3. Update the document
    await userRef.update({
      kycData: {
        nin,
        bvn,
        passportUrl,
        cacUrl,
        statusReportUrl,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      status: "pending", // Set status to trigger the "Pending" UI on the mobile app
      kycUpdateHistory: admin.firestore.FieldValue.arrayUnion({
        action: "submitted",
        timestamp: new Date().toISOString(),
      }),
    });

    res.status(200).json({
      success: true,
      message:
        "KYC documents submitted successfully. Verification is now pending.",
    });
  } catch (error) {
    console.error("KYC Submission Error:", error);
    res
      .status(500)
      .json({ message: "Failed to submit KYC documents. Please try again." });
  }
};

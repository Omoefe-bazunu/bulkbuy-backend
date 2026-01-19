const { db, admin } = require("../config/firebase");

exports.submitSubscription = async (req, res) => {
  try {
    const { planType, amount, receiptUrl } = req.body;
    const userId = req.user.id;

    const subData = {
      userId,
      planType, // 'monthly' or 'annual'
      amount,
      receiptUrl,
      status: "pending",
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("subscriptions").add(subData);

    // Optionally update user status to indicate a pending payment
    await db.collection("users").doc(userId).update({
      paymentStatus: "pending",
    });

    res.status(200).json({
      success: true,
      message: "Subscription request submitted for review",
    });
  } catch (error) {
    res.status(500).json({ message: "Subscription submission failed" });
  }
};

exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const snapshot = await db
      .collection("subscriptions")
      .where("userId", "==", userId)
      .orderBy("submittedAt", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) return res.status(200).json({ status: "none" });

    const data = snapshot.docs[0].data();
    const now = new Date();

    // Auto-expiry logic
    if (data.status === "verified" && data.expiryDate) {
      const expiry = data.expiryDate.toDate
        ? data.expiryDate.toDate()
        : new Date(data.expiryDate);
      if (now > expiry) {
        return res.status(200).json({ status: "none" }); // Reset to form if expired
      }
    }

    res.status(200).json({
      ...data,
      id: snapshot.docs[0].id,
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking status" });
  }
};

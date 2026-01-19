const { db, admin } = require("../config/firebase");

// --- GET ALL PENDING KYC ---
exports.getPendingKYC = async (req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .where("status", "==", "pending")
      .get();
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching KYC requests" });
  }
};

// --- APPROVE/REJECT KYC ---
exports.updateKYCStatus = async (req, res) => {
  const { userId, status, adminNote } = req.body; // status: 'verified' or 'rejected'
  try {
    await db
      .collection("users")
      .doc(userId)
      .update({
        status,
        kycAdminNote: adminNote || "",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    res.status(200).json({ success: true, message: `User KYC ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

// --- GET ALL PENDING SUBSCRIPTIONS ---
exports.getPendingSubscriptions = async (req, res) => {
  try {
    const snapshot = await db
      .collection("subscriptions")
      .where("status", "==", "pending")
      .get();
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching Subscriptions" });
  }
};

// --- APPROVE/REJECT SUBSCRIPTION ---
exports.updateSubscriptionStatus = async (req, res) => {
  const { subId, userId, status, planType } = req.body;
  try {
    const now = new Date();
    let expiryDate = new Date();

    if (status === "verified") {
      if (planType === "monthly") expiryDate.setMonth(now.getMonth() + 1);
      else if (planType === "annual")
        expiryDate.setFullYear(now.getFullYear() + 1);
    }

    const batch = db.batch();

    // Update Subscription record
    const subRef = db.collection("subscriptions").doc(subId);
    batch.update(subRef, {
      status,
      expiryDate,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const userRef = db.collection("users").doc(userId);
    batch.update(userRef, {
      paymentStatus: status,
      // If verified, you can choose to change the role to 'seller' or 'pro'
      role: status === "verified" ? "seller" : "buyer",
    });

    await batch.commit();
    res.status(200).json({ success: true, message: `Subscription ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

// --- GET ALL USERS ---
exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await db
      .collection("users")
      .orderBy("createdAt", "desc")
      .get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      delete data.password; // Security [cite: 95]
      return { id: doc.id, ...data };
    });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

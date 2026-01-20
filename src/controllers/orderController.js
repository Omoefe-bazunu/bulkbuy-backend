const { db } = require("../config/firebase");
const admin = require("firebase-admin");

// 1. Fetch Chat List (Inbox)
exports.getMyChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch deals where user is the buyer
    const buyerSnapshot = await db
      .collection("orders")
      .where("buyerId", "==", userId)
      .get();

    // Fetch deals where user is the seller
    const sellerSnapshot = await db
      .collection("orders")
      .where("sellerId", "==", userId)
      .get();

    const buyerChats = buyerSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const sellerChats = sellerSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Combine and sort by last activity (descending)
    const allChats = [...buyerChats, ...sellerChats].sort((a, b) => {
      const timeA = a.updatedAt?._seconds || 0;
      const timeB = b.updatedAt?._seconds || 0;
      return timeB - timeA;
    });

    res.status(200).json(allChats);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to load inbox", error: error.message });
  }
};

// 2. Fetch Message History (Initial Load)
exports.getChatMessages = async (req, res) => {
  try {
    const { orderId } = req.params;
    const snapshot = await db
      .collection("orders")
      .doc(orderId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .get();

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

// 3. Update Order Status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body; // e.g., 'completed', 'cancelled'

    await db.collection("orders").doc(orderId).update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res
      .status(200)
      .json({ success: true, message: `Order marked as ${status}` });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

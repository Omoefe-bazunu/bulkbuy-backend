const { db } = require("../config/firebase");
const admin = require("firebase-admin");

// 1. Fetch Chat List (Inbox)
exports.getMyChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch orders where user is either buyer or seller
    const [buyerSnapshot, sellerSnapshot] = await Promise.all([
      db.collection("orders").where("buyerId", "==", userId).get(),
      db.collection("orders").where("sellerId", "==", userId).get(),
    ]);

    const allOrderDocs = [...buyerSnapshot.docs, ...sellerSnapshot.docs];

    // Map through orders and fetch the other party's current fullName from Users collection
    const chatsWithNames = await Promise.all(
      allOrderDocs.map(async (doc) => {
        const orderData = doc.data();
        const otherPartyId =
          userId === orderData.buyerId ? orderData.sellerId : orderData.buyerId;

        // Fetch the other user's current data
        const userDoc = await db.collection("users").doc(otherPartyId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        return {
          id: doc.id,
          ...orderData,
          // Override with the fresh name from the users collection
          partnerFullName: userData ? userData.fullName : "BulkBuy User",
        };
      }),
    );

    // Sort by most recent activity
    const sortedChats = chatsWithNames.sort((a, b) => {
      const timeA = a.updatedAt?._seconds || 0;
      const timeB = b.updatedAt?._seconds || 0;
      return timeB - timeA;
    });

    res.status(200).json(sortedChats);
  } catch (error) {
    console.error("GetMyChats Error:", error);
    res.status(500).json({ message: "Failed to load chats" });
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

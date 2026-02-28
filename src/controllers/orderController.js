const { db } = require("../config/firebase");
const admin = require("firebase-admin");

/**
 * 1. Checkout (Place Order from Cart)
 * Processes multiple items from different sellers in one transaction.
 */
exports.checkout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { items, totalAmount, deliveryAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const orderRef = db.collection("orders").doc();
    const orderData = {
      buyerId: userId,
      items: items.map((item) => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image,
        sellerId: item.sellerId,
      })),
      totalAmount,
      deliveryAddress: deliveryAddress || null,
      paymentMethod: paymentMethod || "card",
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await orderRef.set(orderData);

    res.status(201).json({
      success: true,
      orderId: orderRef.id,
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("Checkout Error:", error);
    res.status(500).json({ message: "Checkout failed" });
  }
};

/**
 * 2. Get My Orders (Purchase History)
 * Fetches all orders placed by the current user.
 */
exports.getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const snapshot = await db
      .collection("orders")
      .where("buyerId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(orders);
  } catch (error) {
    console.error("GetMyOrders Error:", error);
    res.status(500).json({ message: "Failed to load order history" });
  }
};

/**
 * 3. Update Order Status
 * Used for administrative or seller updates (e.g., marking as delivered).
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // 1. Validate status value
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "completed",
      "cancelled",
    ];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // 2. Check order exists
    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return res.status(404).json({ message: "Order not found" });
    }

    // 3. Authorization — buyer or seller on this order only
    const order = orderDoc.data();
    const isBuyer = order.buyerId === req.user.id;
    const isSeller = order.items.some((item) => item.sellerId === req.user.id);

    if (!isBuyer && !isSeller) {
      return res
        .status(403)
        .json({ message: "Unauthorized to update this order" });
    }

    // 4. Restrict status changes by role
    if (isBuyer && status !== "cancelled") {
      return res.status(403).json({ message: "Buyers can only cancel orders" });
    }

    if (isSeller && status === "cancelled") {
      return res.status(403).json({ message: "Sellers cannot cancel orders" });
    }

    // 5. Perform the update
    await orderRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ message: "Failed to update status" });
  }
};

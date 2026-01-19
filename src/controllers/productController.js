const { db, admin } = require("../config/firebase");

exports.addProduct = async (req, res) => {
  try {
    const { name, description, isPromo, images, video, pricingTiers } =
      req.body;
    const userId = req.user.id;

    const productData = {
      userId,
      name,
      description,
      isPromo,
      images, // Array of Firebase Storage URLs
      video, // Single URL or null
      pricingTiers, // [{min, max, price}]
      status: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("products").add(productData);

    res.status(201).json({
      success: true,
      productId: docRef.id,
      message: "Product listed successfully",
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error listing product", error: error.message });
  }
};

exports.getUserProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const snapshot = await db
      .collection("products")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: "Error fetching products" });
  }
};

exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Fetch Products
    const productsSnap = await db
      .collection("products")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    // 2. Fetch Orders
    const ordersSnap = await db
      .collection("orders")
      .where("sellerId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const products = productsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const orders = ordersSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ products, orders });
  } catch (error) {
    console.error("Dashboard Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard data" });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const productRef = db.collection("products").doc(productId);
    const doc = await productRef.get();

    if (!doc.exists)
      return res.status(404).json({ message: "Product not found" });

    const productData = doc.data();

    // Security: Ensure only the owner can delete
    if (productData.userId !== userId) {
      return res.status(403).json({ message: "Unauthorized deletion attempt" });
    }

    // 1. Delete Media from Firebase Storage
    // We parse the URL to get the file path in the bucket
    const deleteFile = async (url) => {
      try {
        const filePath = decodeURIComponent(url.split("/o/")[1].split("?")[0]);
        await admin.storage().bucket().file(filePath).delete();
      } catch (e) {
        console.error("Storage delete failed for:", url);
      }
    };

    if (productData.images)
      await Promise.all(productData.images.map((url) => deleteFile(url)));
    if (productData.video) await deleteFile(productData.video);

    // 2. Delete Firestore Document
    await productRef.delete();

    res
      .status(200)
      .json({ success: true, message: "Product and media deleted" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed", error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    const updates = req.body; // Contains name, desc, tiers, images, etc.

    const productRef = db.collection("products").doc(productId);
    const doc = await productRef.get();

    if (!doc.exists) return res.status(404).json({ message: "Not found" });
    if (doc.data().userId !== userId)
      return res.status(403).json({ message: "Unauthorized" });

    // Update Firestore with new data
    await productRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).json({ success: true, message: "Product updated" });
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

exports.completeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const orderRef = db.collection("orders").doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists)
      return res.status(404).json({ message: "Order not found" });
    if (orderDoc.data().sellerId !== userId)
      return res.status(403).json({ message: "Unauthorized" });

    await orderRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res
      .status(200)
      .json({ success: true, message: "Order marked as completed" });
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

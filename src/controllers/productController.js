const { db, admin } = require("../config/firebase");

exports.addProduct = async (req, res) => {
  try {
    const { name, description, isPromo, images, video, pricingTiers } =
      req.body;
    const userId = req.user.id;

    const productData = {
      userId,
      name,
      searchName: name.toLowerCase(), // For case-insensitive search
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

// Get Marketplace Products (Paginated & Sorted)
exports.getMarketplace = async (req, res) => {
  try {
    const { lastVisible, limit = 10, search = "" } = req.query;

    // Base Query: Only show active products
    let query = db.collection("products").where("status", "==", "active");

    if (search.trim()) {
      const searchStr = search.toLowerCase();
      // Prefix search: matches names starting with the search string
      // Note: This requires a composite index (status, name, createdAt)
      query = query
        .where("searchName", ">=", search.toLowerCase())
        .where("searchName", "<=", search.toLowerCase() + "\uf8ff")
        .orderBy("searchName");
    } else {
      // Default view: Latest products
      query = query.orderBy("createdAt", "desc");
    }

    query = query.limit(Number(limit));

    // Pagination logic
    if (lastVisible) {
      const lastDoc = await db.collection("products").doc(lastVisible).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    const products = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const lastId =
      snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1].id
        : null;

    res.status(200).json({ products, lastId });
  } catch (error) {
    console.error("Marketplace Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("products").doc(id).get();

    if (!doc.exists)
      return res.status(404).json({ message: "Product not found" });

    const product = { id: doc.id, ...doc.data() };

    // Fetch associated reviews to calculate real stats
    const reviewsSnap = await db
      .collection("reviews")
      .where("productId", "==", id)
      .get();

    const reviews = reviewsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const totalRatings = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avgRating =
      reviews.length > 0 ? (totalRatings / reviews.length).toFixed(1) : "0.0";

    res.status(200).json({
      ...product,
      avgRating,
      reviewCount: reviews.length,
      reviews,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching details" });
  }
};

exports.initiateOrder = async (req, res) => {
  try {
    const {
      productId,
      sellerId,
      productName,
      quantity,
      totalAmount,
      sellerName,
    } = req.body;
    const buyerId = req.user.id;

    // Prevent users from buying their own products
    if (buyerId === sellerId) {
      return res
        .status(400)
        .json({ message: "You cannot purchase your own product" });
    }

    // Check if a negotiation already exists for this buyer and product to avoid duplicates
    const existingOrder = await db
      .collection("orders")
      .where("buyerId", "==", buyerId)
      .where("productId", "==", productId)
      .where("status", "==", "pending")
      .limit(1)
      .get();

    if (!existingOrder.empty) {
      return res.status(200).json({
        success: true,
        orderId: existingOrder.docs[0].id,
        message: "Continuing existing negotiation",
      });
    }

    const orderData = {
      productId,
      sellerId,
      buyerId,
      buyerName: req.user.fullName || req.user.name || "Buyer",
      sellerName: sellerName || "Seller", // Passed from frontend
      productName,
      quantity: Number(quantity),
      totalAmount: Number(totalAmount),
      status: "pending",
      // NEW FIELDS FOR CHAT LIST
      lastMessage: "Negotiation started",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("orders").add(orderData);

    res.status(201).json({
      success: true,
      orderId: docRef.id,
    });
  } catch (error) {
    console.error("Initiate Order Error:", error);
    res.status(500).json({ message: "Failed to initiate order" });
  }
};

// Fetch reviews and average rating for a specific product
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const snapshot = await db
      .collection("reviews")
      .where("productId", "==", productId)
      .orderBy("createdAt", "desc")
      .get();

    const reviews = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Calculate Stats
    const total = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg =
      reviews.length > 0 ? (total / reviews.length).toFixed(1) : "0.0";

    res
      .status(200)
      .json({ reviews, avgRating: avg, reviewCount: reviews.length });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch reviews" });
  }
};

// Add or Update a Review
exports.addReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;
    const displayName = req.user?.fullName || "Anonymous User";

    const reviewData = {
      productId,
      userId,
      fullName: displayName,
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const reviewId = `${userId}_${productId}`;

    // 1. Save the review
    await db
      .collection("reviews")
      .doc(reviewId)
      .set(reviewData, { merge: true });

    // 2. Fetch all reviews for this product to recalculate stats
    const reviewsSnap = await db
      .collection("reviews")
      .where("productId", "==", productId)
      .get();
    const reviews = reviewsSnap.docs.map((d) => d.data());

    const reviewCount = reviews.length;
    const avgRating = (
      reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount
    ).toFixed(1);

    // 3. Update the Product document so the Marketplace can see it instantly
    await db.collection("products").doc(productId).update({
      avgRating,
      reviewCount,
    });

    res
      .status(200)
      .json({ success: true, message: "Review saved and stats updated" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to save review", error: error.message });
  }
};

// Delete a specific review
exports.deleteReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;
    const reviewId = `${userId}_${productId}`;

    await db.collection("reviews").doc(reviewId).delete();

    // Recalculate and update product document
    const reviewsSnap = await db
      .collection("reviews")
      .where("productId", "==", productId)
      .get();
    const reviews = reviewsSnap.docs.map((d) => d.data());

    const reviewCount = reviews.length;
    const avgRating =
      reviewCount > 0
        ? (
            reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount
          ).toFixed(1)
        : "0.0";

    await db.collection("products").doc(productId).update({
      avgRating,
      reviewCount,
    });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting review" });
  }
};

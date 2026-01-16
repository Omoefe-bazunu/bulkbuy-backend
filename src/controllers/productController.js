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

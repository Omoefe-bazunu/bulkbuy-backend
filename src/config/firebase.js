const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let serviceAccount;

try {
  // 1. Check for raw JSON string in .env (Best for Production/Render)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }
  // 2. Check for local file (Best for Development)
  else {
    const serviceAccountPath = path.resolve(
      __dirname,
      "../../serviceAccountKey.json",
    );
    if (fs.existsSync(serviceAccountPath)) {
      serviceAccount = require(serviceAccountPath);
    }
  }

  if (serviceAccount && !admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "high-481fd.firebasestorage.app",
    });
    console.log("✅ Firebase Admin Initialized Successfully");
  } else {
    console.error(
      "❌ Firebase Initialization Failed: No Service Account Found.",
    );
  }
} catch (err) {
  console.error("❌ Firebase Init Error:", err.message);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { admin, db, bucket };

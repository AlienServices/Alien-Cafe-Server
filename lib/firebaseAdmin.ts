import admin from "firebase-admin";

const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;

if (serviceAccountJson) {
  try {
    const serviceAccount = JSON.parse(serviceAccountJson);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("Firebase Admin initialized successfully");
    }
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
  }
} else {
  console.warn(
    "FCM_SERVICE_ACCOUNT_JSON environment variable is not set; Firebase Admin not initialized",
  );
}

export default admin;

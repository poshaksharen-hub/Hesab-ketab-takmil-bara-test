
import * as admin from 'firebase-admin';

// This function centralizes the initialization of the Firebase Admin SDK.
// It ensures that the app is only initialized once.
export function initializeFirebaseAdmin() {
  // Check if the app is already initialized to prevent errors.
  if (admin.apps.length === 0) {
    const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64;

    if (!serviceAccountKeyBase64) {
      // In a serverless environment like Vercel or Netlify, you must set the env var.
      // App Hosting might provide default credentials automatically.
      try {
        // Try initializing with default credentials provided by the environment (e.g., App Hosting)
        admin.initializeApp();
        console.log("Firebase Admin initialized with default application credentials.");
      } catch (e) {
        console.error("Default Firebase Admin initialization failed. FIREBASE_SERVICE_ACCOUNT_KEY_BASE64 env var is missing. Please set it in your environment.");
        throw new Error("Firebase Admin SDK initialization failed: Service account key is missing.");
      }
    } else {
       // Decode the Base64 string to get the JSON service account key.
      const serviceAccountJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Add your storage bucket URL if it's not automatically detected
        storageBucket: `${serviceAccount.project_id}.appspot.com`
      });
      console.log("Firebase Admin initialized with service account from environment variable.");
    }
  }
}

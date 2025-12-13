const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let firebaseAdmin = null;

const initializeFirebase = () => {
  try {
    // Path to service account key
    const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

    // Check if service account file exists
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error('serviceAccountKey.json file not found');
    }

    // Read service account key
    const serviceAccount = require(serviceAccountPath);

    // Initialize Firebase Admin
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id || 'dvision-academy'
    });

    console.log('✓ Firebase Admin initialized successfully');
    return firebaseAdmin;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error.message);
    // Don't throw error, allow server to continue without Firebase
    return null;
  }
};

// Get Firebase Admin instance
const getFirebaseAdmin = () => {
  if (!firebaseAdmin) {
    const initialized = initializeFirebase();
    if (!initialized) {
      return null;
    }
  }
  return firebaseAdmin;
};

module.exports = {
  initializeFirebase,
  getFirebaseAdmin,
  admin
};


import admin from 'firebase-admin';

if (!process.env.FCM_SERVICE_ACCOUNT_JSON) {
  throw new Error('FCM_SERVICE_ACCOUNT_JSON environment variable is not set');
}

try {
  const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  throw error;
}

export default admin; 
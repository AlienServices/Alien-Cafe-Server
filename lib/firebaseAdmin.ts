import admin from 'firebase-admin';

const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON!);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin; 
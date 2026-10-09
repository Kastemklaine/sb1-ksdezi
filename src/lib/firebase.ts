import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyD4FnAbnHJo8rzf5EQayPNJbjfLHdmptFo",
  authDomain: "quimperle-a-hauteur-d-enfant.firebaseapp.com",
  databaseURL: "https://quimperle-a-hauteur-d-enfant-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "quimperle-a-hauteur-d-enfant",
  storageBucket: "quimperle-a-hauteur-d-enfant.firebasestorage.app",
  messagingSenderId: "453891091742",
  appId: "1:453891091742:web:5adb368c39947a0d116d0f"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Sign in anonymously as soon as the app loads so Firebase security rules can
// require `auth != null`. Invisible to users (no login screen) but it means only
// clients that actually loaded the app — and thus received a valid Firebase token
// — can read/write the database. Closes the "open to the whole internet" hole.
// Requires the Anonymous provider enabled in the Firebase console
// (Authentication → Sign-in method → Anonymous).
signInAnonymously(auth).catch((e) => {
  console.error('Firebase anonymous auth failed:', e);
});

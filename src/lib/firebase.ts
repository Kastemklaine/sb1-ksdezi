import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

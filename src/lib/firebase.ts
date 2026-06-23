import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase web config for project "fir-94b95" (AlphaTok).
// The apiKey is a public client identifier, not a secret — access is controlled
// by Firebase Security Rules, not by hiding this value.
const firebaseConfig = {
  apiKey: "AIzaSyCP53Sh2WfS2rrm1teeQSzfmnrpoziHve4",
  authDomain: "fir-94b95.firebaseapp.com",
  projectId: "fir-94b95",
  storageBucket: "fir-94b95.firebasestorage.app",
  messagingSenderId: "923613548639",
  appId: "1:923613548639:web:42b61a3cdc21720475cbea",
  measurementId: "G-91S34F1GVZ",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

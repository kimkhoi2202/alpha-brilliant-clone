import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Firebase web config for project "fir-94b95".
// The apiKey is a public client identifier, not a secret: access is controlled
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

// Phase 2 (AI): client handle for our callable Cloud Functions. The default
// region (us-central1) matches the backend's setGlobalOptions in functions/.
// Importing this is inert — no AI path runs unless aiEnabled() is true and an
// `src/lib/ai/client.ts` wrapper is actually called.
export const functions = getFunctions(app);

// Offline-first: progress/streak writes survive reloads and brief disconnects,
// and resume is consistent across tabs (PRD §1.5 Reliability).
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const googleProvider = new GoogleAuthProvider();

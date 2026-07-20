import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore, setLogLevel, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};

// Check if we have at least apiKey and projectId to initialize
const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    // Silence noisy internal connection warnings/errors from Firebase SDK completely
    setLogLevel("silent");

    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    try {
      // Initialize Firestore with robust local persistent cache for seamless offline operation
      // Enable experimentalForceLongPolling to allow connection inside restricted iframes and sandboxes
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
      });
      console.log("Firebase initialized successfully with persistent local cache. Project ID:", firebaseConfig.projectId);
    } catch (cacheErr) {
      console.warn("Failed to initialize Firestore with persistent local cache (e.g. security constraints in iframe). Falling back to memory-only Firestore:", cacheErr);
      try {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
        });
      } catch (fallbackErr) {
        db = getFirestore(app);
      }
      console.log("Firebase initialized successfully with fallback options. Project ID:", firebaseConfig.projectId);
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else {
  console.log("Firebase is running in local storage fallback mode (no client ID or projectId found in env).");
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout"));
    }, timeoutMs);
    promise
      .then((res) => {
        clearTimeout(timeout);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

export { db, isFirebaseConfigured };

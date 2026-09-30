import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAKr08wtREdmpEFujlMhXx2vNAtIv9xEGE",
  authDomain: "pumpsites-57d58.firebaseapp.com",
  projectId: "pumpsites-57d58",
  storageBucket: "pumpsites-57d58.firebasestorage.app",
  messagingSenderId: "784223497773",
  appId: "1:784223497773:web:02e641131f4bdab2fbd2a4",
  measurementId: "G-75QBR09E2F"
};

export const SITE_ID = "arthur-and-longnose";
export const DEFAULT_CA = "ARTHURxLONGNOSE7xHqZ3kM8p9vD2wB1sY5tCuS1pump";
export const MASTER_PASSCODE = "fuku2026";

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Fetch CA once from Firestore
 */
export async function getCA(siteId = SITE_ID) {
  try {
    const docRef = doc(db, "sites", siteId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.ca && typeof data.ca === "string" && data.ca.trim().length > 10) {
        return data.ca.trim();
      }
    }
  } catch (err) {
    console.warn("Firestore read failed, fallback to local:", err);
  }
  return DEFAULT_CA;
}

/**
 * Save new CA to Firestore
 */
export async function saveCA(newCA, siteId = SITE_ID) {
  const docRef = doc(db, "sites", siteId);
  await setDoc(
    docRef,
    {
      ca: newCA.trim(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

/**
 * Real-time CA subscriber
 */
export function subscribeToCA(callback, siteId = SITE_ID) {
  try {
    const docRef = doc(db, "sites", siteId);
    return onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data?.ca && typeof data.ca === "string" && data.ca.trim().length > 10) {
            callback(data.ca.trim());
            return;
          }
        }
        callback(DEFAULT_CA);
      },
      (error) => {
        console.warn("Firestore snapshot listener error:", error);
        callback(DEFAULT_CA);
      }
    );
  } catch (err) {
    console.warn("Could not attach listener:", err);
    callback(DEFAULT_CA);
    return () => {};
  }
}

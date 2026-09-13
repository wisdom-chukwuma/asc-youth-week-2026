// Fill this in with YOUR Firebase project's web config.
// Firebase console -> Project settings -> General -> Your apps -> SDK setup and config.
// See ../SETUP.md for the full walkthrough (takes about 10 minutes).
export const firebaseConfig = {
  apiKey: "AIzaSyAwJXyrfFUsGdpDOsjoZ4hJLtHqgHgvs8U",
  authDomain: "asc-youth-week-2026.firebaseapp.com",
  projectId: "asc-youth-week-2026",
  storageBucket: "asc-youth-week-2026.firebasestorage.app",
  messagingSenderId: "330796924622",
  appId: "1:330796924622:web:4c77832ad5fa20c3491a9f"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  runTransaction,
  serverTimestamp,
  increment,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-storage.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  runTransaction,
  serverTimestamp,
  increment,
  arrayUnion,
  signInAnonymously,
  onAuthStateChanged,
  ref,
  uploadBytes,
  getDownloadURL
};

export function whenReady() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) resolve(user);
    });
    signInAnonymously(auth).catch(reject);
  });
}

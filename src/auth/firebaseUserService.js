import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firestoreDb } from "../firebase/firebaseApp.js";

export async function getFirebaseUserProfile(uid) {
  const reference = doc(firestoreDb, "users", uid);

  const snapshot = await getDoc(reference);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firestoreDb } from "../firebase/firebaseApp.js";

const ATTEMPTS_COLLECTION = "attempts";

function attemptRef(attemptId) {
  return doc(firestoreDb, ATTEMPTS_COLLECTION, attemptId);
}

export async function saveRemoteAttempt(attempt, user = null) {
  if (!attempt?.id) {
    throw new Error("Impossibile salvare una prova senza id.");
  }

  await setDoc(attemptRef(attempt.id), {
    ...attempt,
    updatedAt: serverTimestamp(),
    updatedBy: user
      ? {
          id: user.id,
          username: user.username,
          email: user.email || "",
          role: user.role
        }
      : null
  }, { merge: true });
}

export async function deleteRemoteAttempt(attemptId) {
  if (!attemptId) return;
  await deleteDoc(attemptRef(attemptId));
}

export async function loadRemoteAttempts() {
  const snapshot = await getDocs(collection(firestoreDb, ATTEMPTS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...attempt } = data;

    return {
      id: documentSnapshot.id,
      ...attempt
    };
  });
}

export async function loadRemoteAttemptsBySport(sportId) {
  const attemptsQuery = query(
    collection(firestoreDb, ATTEMPTS_COLLECTION),
    where("sportId", "==", sportId)
  );
  const snapshot = await getDocs(attemptsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...attempt } = data;

    return {
      id: documentSnapshot.id,
      ...attempt
    };
  });
}

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

const RESULTS_COLLECTION = "results";

function resultRef(resultId) {
  return doc(firestoreDb, RESULTS_COLLECTION, resultId);
}

export async function saveRemoteResult(result, user = null) {
  if (!result?.id) {
    throw new Error("Impossibile salvare un risultato senza id.");
  }

  await setDoc(resultRef(result.id), {
    ...result,
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

export async function deleteRemoteResult(resultId) {
  if (!resultId) return;
  await deleteDoc(resultRef(resultId));
}

export async function loadRemoteResults() {
  const snapshot = await getDocs(collection(firestoreDb, RESULTS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...result } = data;

    return {
      id: documentSnapshot.id,
      ...result
    };
  });
}

export async function loadRemoteResultsBySport(sportId) {
  const resultsQuery = query(
    collection(firestoreDb, RESULTS_COLLECTION),
    where("sportId", "==", sportId)
  );
  const snapshot = await getDocs(resultsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...result } = data;

    return {
      id: documentSnapshot.id,
      ...result
    };
  });
}

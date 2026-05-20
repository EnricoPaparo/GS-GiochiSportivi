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

const SPORTS_COLLECTION = "sports";

function sportRef(sportId) {
  return doc(firestoreDb, SPORTS_COLLECTION, sportId);
}

export async function saveRemoteSport(sport, user = null) {
  if (!sport?.id) {
    throw new Error("Impossibile salvare uno sport senza id.");
  }

  await setDoc(sportRef(sport.id), {
    ...sport,
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

export async function deleteRemoteSport(sportId) {
  if (!sportId) return;
  await deleteDoc(sportRef(sportId));
}

export async function loadRemoteSports() {
  const snapshot = await getDocs(collection(firestoreDb, SPORTS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...sport } = data;

    return {
      id: documentSnapshot.id,
      ...sport
    };
  });
}

export async function loadRemoteSportsByDay(dayId) {
  const sportsQuery = query(
    collection(firestoreDb, SPORTS_COLLECTION),
    where("dayId", "==", dayId)
  );
  const snapshot = await getDocs(sportsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...sport } = data;

    return {
      id: documentSnapshot.id,
      ...sport
    };
  });
}

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firestoreDb } from "../firebase/firebaseApp.js";

const SPORTS_DAYS_COLLECTION = "sportsDays";

function sportsDayRef(dayId) {
  return doc(firestoreDb, SPORTS_DAYS_COLLECTION, dayId);
}

export async function saveRemoteSportsDay(day, user = null) {
  if (!day?.id) {
    throw new Error("Impossibile salvare una giornata senza id.");
  }

  await setDoc(sportsDayRef(day.id), {
    ...day,
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

export async function deleteRemoteSportsDay(dayId) {
  if (!dayId) return;
  await deleteDoc(sportsDayRef(dayId));
}

export async function loadRemoteSportsDays() {
  const snapshot = await getDocs(collection(firestoreDb, SPORTS_DAYS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...day } = data;

    return {
      id: documentSnapshot.id,
      ...day
    };
  });
}

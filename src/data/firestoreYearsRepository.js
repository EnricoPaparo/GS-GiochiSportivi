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

const YEARS_COLLECTION = "years";

function yearRef(yearId) {
  return doc(firestoreDb, YEARS_COLLECTION, yearId);
}

export async function saveRemoteYear(year, user = null) {
  if (!year?.id) {
    throw new Error("Impossibile salvare un anno senza id.");
  }

  await setDoc(yearRef(year.id), {
    ...year,
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

export async function deleteRemoteYear(yearId) {
  if (!yearId) return;
  await deleteDoc(yearRef(yearId));
}

export async function loadRemoteYears() {
  const snapshot = await getDocs(collection(firestoreDb, YEARS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...year } = data;

    return {
      id: documentSnapshot.id,
      ...year
    };
  });
}

export async function loadRemoteYearsByDay(dayId) {
  const yearsQuery = query(
    collection(firestoreDb, YEARS_COLLECTION),
    where("dayId", "==", dayId)
  );
  const snapshot = await getDocs(yearsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...year } = data;

    return {
      id: documentSnapshot.id,
      ...year
    };
  });
}

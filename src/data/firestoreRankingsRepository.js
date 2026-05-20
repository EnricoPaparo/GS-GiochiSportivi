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

const RANKINGS_COLLECTION = "rankings";

function rankingRef(rankingId) {
  return doc(firestoreDb, RANKINGS_COLLECTION, rankingId);
}

export async function saveRemoteRanking(ranking, user = null) {
  if (!ranking?.id) {
    throw new Error("Impossibile salvare una classifica senza id.");
  }

  await setDoc(rankingRef(ranking.id), {
    ...ranking,
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

export async function deleteRemoteRanking(rankingId) {
  if (!rankingId) return;
  await deleteDoc(rankingRef(rankingId));
}

export async function loadRemoteRankings() {
  const snapshot = await getDocs(collection(firestoreDb, RANKINGS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...ranking } = data;

    return {
      id: documentSnapshot.id,
      ...ranking
    };
  });
}

export async function loadRemoteRankingsByDay(dayId) {
  const rankingsQuery = query(
    collection(firestoreDb, RANKINGS_COLLECTION),
    where("dayId", "==", dayId)
  );
  const snapshot = await getDocs(rankingsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...ranking } = data;

    return {
      id: documentSnapshot.id,
      ...ranking
    };
  });
}

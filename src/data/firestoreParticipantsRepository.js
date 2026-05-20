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

const PARTICIPANTS_COLLECTION = "participants";

function participantRef(participantId) {
  return doc(firestoreDb, PARTICIPANTS_COLLECTION, participantId);
}

export async function saveRemoteParticipant(participant, user = null) {
  if (!participant?.id) {
    throw new Error("Impossibile salvare un partecipante senza id.");
  }

  await setDoc(participantRef(participant.id), {
    ...participant,
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

export async function deleteRemoteParticipant(participantId) {
  if (!participantId) return;
  await deleteDoc(participantRef(participantId));
}

export async function loadRemoteParticipants() {
  const snapshot = await getDocs(collection(firestoreDb, PARTICIPANTS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...participant } = data;

    return {
      id: documentSnapshot.id,
      ...participant
    };
  });
}

export async function loadRemoteParticipantsBySport(sportId) {
  const participantsQuery = query(
    collection(firestoreDb, PARTICIPANTS_COLLECTION),
    where("sportId", "==", sportId)
  );
  const snapshot = await getDocs(participantsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...participant } = data;

    return {
      id: documentSnapshot.id,
      ...participant
    };
  });
}

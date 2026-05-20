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

const RELAY_TEAMS_COLLECTION = "relayTeams";

function relayTeamRef(teamId) {
  return doc(firestoreDb, RELAY_TEAMS_COLLECTION, teamId);
}

export async function saveRemoteRelayTeam(team, user = null) {
  if (!team?.id) {
    throw new Error("Impossibile salvare una squadra senza id.");
  }

  await setDoc(relayTeamRef(team.id), {
    ...team,
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

export async function deleteRemoteRelayTeam(teamId) {
  if (!teamId) return;
  await deleteDoc(relayTeamRef(teamId));
}

export async function loadRemoteRelayTeams() {
  const snapshot = await getDocs(collection(firestoreDb, RELAY_TEAMS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...team } = data;

    return {
      id: documentSnapshot.id,
      ...team
    };
  });
}

export async function loadRemoteRelayTeamsBySport(sportId) {
  const teamsQuery = query(
    collection(firestoreDb, RELAY_TEAMS_COLLECTION),
    where("sportId", "==", sportId)
  );
  const snapshot = await getDocs(teamsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...team } = data;

    return {
      id: documentSnapshot.id,
      ...team
    };
  });
}

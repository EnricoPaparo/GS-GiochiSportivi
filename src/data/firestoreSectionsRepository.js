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

const SECTIONS_COLLECTION = "sections";

function sectionRef(sectionId) {
  return doc(firestoreDb, SECTIONS_COLLECTION, sectionId);
}

export async function saveRemoteSection(section, user = null) {
  if (!section?.id) {
    throw new Error("Impossibile salvare una sezione senza id.");
  }

  await setDoc(sectionRef(section.id), {
    ...section,
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

export async function deleteRemoteSection(sectionId) {
  if (!sectionId) return;
  await deleteDoc(sectionRef(sectionId));
}

export async function loadRemoteSections() {
  const snapshot = await getDocs(collection(firestoreDb, SECTIONS_COLLECTION));

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...section } = data;

    return {
      id: documentSnapshot.id,
      ...section
    };
  });
}

export async function loadRemoteSectionsByYear(yearId) {
  const sectionsQuery = query(
    collection(firestoreDb, SECTIONS_COLLECTION),
    where("yearId", "==", yearId)
  );
  const snapshot = await getDocs(sectionsQuery);

  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();
    const { updatedAt, updatedBy, ...section } = data;

    return {
      id: documentSnapshot.id,
      ...section
    };
  });
}

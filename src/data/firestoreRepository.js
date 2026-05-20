import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firestoreDb } from "../firebase/firebaseApp.js";
import { emptyDb } from "./schema.js";
import { migrateDb } from "./migrations.js";

const APP_DB_COLLECTION = "appData";
const APP_DB_DOCUMENT = "main";

function appDbRef() {
  return doc(firestoreDb, APP_DB_COLLECTION, APP_DB_DOCUMENT);
}

export async function saveRemoteDb(db, user = null) {
  await setDoc(appDbRef(), {
    db,
    updatedAt: serverTimestamp(),
    updatedBy: user
      ? {
          id: user.id,
          username: user.username,
          email: user.email || "",
          role: user.role
        }
      : null
  });
}

export async function loadRemoteDb() {
  const snapshot = await getDoc(appDbRef());

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  const remoteDb = data?.db || emptyDb();

  return migrateDb(remoteDb);
}

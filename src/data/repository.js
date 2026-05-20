import { saveRemoteDb } from "./firestoreRepository.js";
import { migrateDb } from "./migrations.js";
import { emptyDb } from "./schema.js";

export function getDb() {
  return migrateDb(emptyDb());
}

export function saveDb(db) {
  return saveRemoteDb(db).catch((error) => {
    console.error("Firestore save failed.", error);
    throw error;
  });
}

export function resetDb() {
  const fresh = getDb();
  saveDb(fresh);
  return fresh;
}

// Session persistence can stay browser-local.
export function getSession() {
  try {
    return JSON.parse(localStorage.getItem("giornateSportive.session.v1"));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(
    "giornateSportive.session.v1",
    JSON.stringify(session)
  );
}

export function clearSession() {
  localStorage.removeItem("giornateSportive.session.v1");
}
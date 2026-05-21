import { saveRemoteDb } from "./firestoreRepository.js";
import { recordEstimatedWrite } from "./firebaseUsage.js";
import { migrateDb } from "./migrations.js";
import { emptyDb, SESSION_KEY } from "./schema.js";

export function getDb() {
  // Runtime shell only: firestoreBootstrapRepository replaces it with remote data before render.
  return migrateDb(emptyDb());
}

export function saveDb(db) {
  const rollbackWrite = recordEstimatedWrite(db);
  return saveRemoteDb(db).catch((error) => {
    rollbackWrite();
    console.error("Firestore save failed.", error);
    throw error;
  });
}

export async function resetDb() {
  const fresh = getDb();
  await saveDb(fresh);
  return fresh;
}

// Session persistence can stay browser-local.
export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(session)
  );
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

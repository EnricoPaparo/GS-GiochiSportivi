import {
  clearSession,
  getDb,
  getSession,
  resetDb,
  saveDb as saveLocalDb,
  saveSession
} from "./localStorageRepository.js";
import { saveRemoteDb } from "./firestoreRepository.js";

export { clearSession, getDb, getSession, resetDb, saveSession };

export function saveDb(db) {
  saveLocalDb(db);

  saveRemoteDb(db).catch((error) => {
    console.warn("Salvataggio Firestore non riuscito; dati mantenuti nella cache locale.", error);
  });
}

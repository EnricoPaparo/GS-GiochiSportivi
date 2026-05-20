// Placeholder intenzionale.
// Questo file verra implementato nello step Firebase/Firestore.
// Deve mantenere la stessa interfaccia pubblica di localStorageRepository.js:
// - getDb()
// - saveDb(db)
// - resetDb()
// - getSession()
// - saveSession(session)
// - clearSession()
//
// Per ora NON e importato da repository.js, quindi l'app continua a usare localStorage.

export function getDb() {
  throw new Error("firestoreRepository non e ancora attivo: usa localStorageRepository tramite repository.js");
}

export function saveDb() {
  throw new Error("firestoreRepository non e ancora attivo: usa localStorageRepository tramite repository.js");
}

export function resetDb() {
  throw new Error("firestoreRepository non e ancora attivo: usa localStorageRepository tramite repository.js");
}

export function getSession() {
  throw new Error("firestoreRepository non e ancora attivo: usa localStorageRepository tramite repository.js");
}

export function saveSession() {
  throw new Error("firestoreRepository non e ancora attivo: usa localStorageRepository tramite repository.js");
}

export function clearSession() {
  throw new Error("firestoreRepository non e ancora attivo: usa localStorageRepository tramite repository.js");
}

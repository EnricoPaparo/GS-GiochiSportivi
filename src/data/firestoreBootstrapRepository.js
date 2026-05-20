import { saveDb as persistDb } from "./repository.js";
import { emptyDb } from "./schema.js";
import { migrateDb } from "./migrations.js";
import { loadRemoteDb } from "./firestoreRepository.js";
import { db } from "../state.js";

function replaceRuntimeDb(nextDb) {
  Object.keys(db).forEach((key) => {
    delete db[key];
  });

  Object.assign(db, migrateDb(nextDb));
  persistDb(db);
}

export async function bootstrapFirestoreFirstDb() {
  try {
    const remoteDb = await loadRemoteDb();

    if (!remoteDb) {
      return { source: "localStorage", loaded: false };
    }

    const nextDb = {
      ...emptyDb(),
      ...db,
      ...remoteDb,
      meta: {
        ...emptyDb().meta,
        ...db.meta,
        ...(remoteDb.meta || {}),
        firestoreFirst: true,
        hydratedAt: new Date().toISOString()
      }
    };

    replaceRuntimeDb(nextDb);
    return { source: "firestoreSnapshot", loaded: true };
  } catch (error) {
    console.warn("Firestore-first bootstrap non riuscito, uso localStorage.", error);
    return { source: "localStorageFallback", loaded: false, error };
  }
}

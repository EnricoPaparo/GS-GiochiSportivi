import { emptyDb } from "./schema.js";
import { migrateDb } from "./migrations.js";
import { loadRemoteDb } from "./firestoreRepository.js";
import { recordEstimatedRead } from "./firebaseUsage.js";
import { db, state } from "../state.js";

function replaceRuntimeDb(nextDb) {
  Object.keys(db).forEach((key) => {
    delete db[key];
  });

  Object.assign(db, migrateDb(nextDb));
}

export async function bootstrapFirestoreFirstDb() {
  try {
    const remoteDb = await loadRemoteDb();

    if (!remoteDb) {
      replaceRuntimeDb(emptyDb());
      recordEstimatedRead(db);
      state.firebaseReadsThisSession += 1;
      return { source: "firestoreEmpty", loaded: false };
    }

    const nextDb = {
      ...emptyDb(),
      ...remoteDb,
      meta: {
        ...emptyDb().meta,
        ...(remoteDb.meta || {}),
        firestoreFirst: true,
        hydratedAt: new Date().toISOString()
      }
    };

    replaceRuntimeDb(nextDb);
    recordEstimatedRead(db);
    state.firebaseReadsThisSession += 1;

    return {
      source: "firestoreSnapshot",
      loaded: true
    };
  } catch (error) {
    console.error("Firestore bootstrap non riuscito.", error);
    return { source: "firestoreError", loaded: false, error };
  }
}

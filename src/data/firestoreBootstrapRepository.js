import { emptyDb } from "./schema.js";
import { migrateDb } from "./migrations.js";
import { loadRemoteDb } from "./firestoreRepository.js";
import { db } from "../state.js";

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

    return {
      source: "firestoreSnapshot",
      loaded: true
    };
  } catch (error) {
    console.error("Firestore bootstrap non riuscito.", error);
    return { source: "firestoreError", loaded: false, error };
  }
}

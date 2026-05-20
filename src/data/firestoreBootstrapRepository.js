import { saveDb as persistDb } from "./repository.js";
import { emptyDb } from "./schema.js";
import { migrateDb } from "./migrations.js";
import { loadRemoteDb } from "./firestoreRepository.js";
import { loadRemoteSportsDays } from "./firestoreSportsDaysRepository.js";
import { loadRemoteSports } from "./firestoreSportsRepository.js";
import { loadRemoteYears } from "./firestoreYearsRepository.js";
import { loadRemoteSections } from "./firestoreSectionsRepository.js";
import { loadRemoteParticipants } from "./firestoreParticipantsRepository.js";
import { loadRemoteRelayTeams } from "./firestoreRelayTeamsRepository.js";
import { loadRemoteAttempts } from "./firestoreAttemptsRepository.js";
import { loadRemoteResults } from "./firestoreResultsRepository.js";
import { loadRemoteRankings } from "./firestoreRankingsRepository.js";
import { db } from "../state.js";

function replaceRuntimeDb(nextDb) {
  Object.keys(db).forEach((key) => {
    delete db[key];
  });

  Object.assign(db, migrateDb(nextDb));
  persistDb(db);
}

function hasCollectionData(collections) {
  return Object.values(collections).some((items) => Array.isArray(items) && items.length > 0);
}

async function loadRemoteCollections() {
  const [
    sportsDays,
    sports,
    years,
    sections,
    participants,
    relayTeams,
    attempts,
    results,
    rankings
  ] = await Promise.all([
    loadRemoteSportsDays(),
    loadRemoteSports(),
    loadRemoteYears(),
    loadRemoteSections(),
    loadRemoteParticipants(),
    loadRemoteRelayTeams(),
    loadRemoteAttempts(),
    loadRemoteResults(),
    loadRemoteRankings()
  ]);

  return {
    sportsDays,
    sports,
    years,
    sections,
    participants,
    relayTeams,
    attempts,
    results,
    rankings
  };
}

export async function bootstrapFirestoreFirstDb() {
  try {
    const [remoteDb, remoteCollections] = await Promise.all([
      loadRemoteDb(),
      loadRemoteCollections()
    ]);

    if (!remoteDb && !hasCollectionData(remoteCollections)) {
      return { source: "localStorage", loaded: false };
    }

    const nextDb = {
      ...emptyDb(),
      ...db,
      ...(remoteDb || {}),
      ...remoteCollections,
      meta: {
        ...emptyDb().meta,
        ...db.meta,
        ...(remoteDb?.meta || {}),
        firestoreFirst: true,
        hydratedAt: new Date().toISOString()
      }
    };

    replaceRuntimeDb(nextDb);

    return {
      source: remoteDb ? "firestoreSnapshotAndCollections" : "firestoreCollections",
      loaded: true
    };
  } catch (error) {
    console.warn("Firestore-first bootstrap non riuscito, uso localStorage.", error);
    return { source: "localStorageFallback", loaded: false, error };
  }
}

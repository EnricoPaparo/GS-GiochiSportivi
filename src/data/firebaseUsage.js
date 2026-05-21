export const FIRESTORE_DAILY_QUOTAS = {
  reads: 50000,
  writes: 20000,
  deletes: 20000
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function ensureFirebaseUsage(targetDb) {
  const current = targetDb.meta?.firebaseUsage || {};
  if (!targetDb.meta) targetDb.meta = {};
  if (current.date === todayKey()) {
    targetDb.meta.firebaseUsage = {
      date: current.date,
      reads: Number(current.reads || 0),
      writes: Number(current.writes || 0),
      deletes: Number(current.deletes || 0)
    };
    return targetDb.meta.firebaseUsage;
  }

  targetDb.meta.firebaseUsage = {
    date: todayKey(),
    reads: 0,
    writes: 0,
    deletes: 0
  };
  return targetDb.meta.firebaseUsage;
}

export function recordEstimatedRead(targetDb) {
  const usage = ensureFirebaseUsage(targetDb);
  usage.reads += 1;
}

export function recordEstimatedWrite(targetDb) {
  const usage = ensureFirebaseUsage(targetDb);
  usage.writes += 1;
  return () => {
    usage.writes = Math.max(usage.writes - 1, 0);
  };
}

export function getFirebaseUsageSummary(targetDb, sessionReads = 0) {
  const usage = ensureFirebaseUsage(targetDb);
  return {
    reads: usage.reads,
    writes: usage.writes,
    deletes: usage.deletes,
    sessionReads,
    quotas: FIRESTORE_DAILY_QUOTAS
  };
}

export const FIRESTORE_DAILY_QUOTAS = {
  writes: 20000
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
      writes: Number(current.writes || 0)
    };
    return targetDb.meta.firebaseUsage;
  }

  targetDb.meta.firebaseUsage = {
    date: todayKey(),
    writes: 0
  };
  return targetDb.meta.firebaseUsage;
}

export function recordFirestoreWrite(targetDb) {
  const usage = ensureFirebaseUsage(targetDb);
  usage.writes += 1;
  return () => {
    usage.writes = Math.max(usage.writes - 1, 0);
  };
}

export function getFirebaseUsageSummary(targetDb) {
  const usage = ensureFirebaseUsage(targetDb);
  return {
    writes: usage.writes,
    quotas: FIRESTORE_DAILY_QUOTAS
  };
}

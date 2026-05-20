import { normalizePositiveInteger } from "../utils/numbers.js";
import { emptyDb, LOCKED_ADMIN_ID, LOCKED_ADMIN_USER } from "./schema.js";

function normalizeSportNameForMigration(name) {
  return name === "VelocitÃ " ? "Velocita" : name;
}

export function migrateDb(source) {
  const base = emptyDb();
  const merged = { ...base, ...source, meta: { ...base.meta, ...(source.meta || {}) } };
  merged.sports.forEach((sport) => {
    sport.name = normalizeSportNameForMigration(sport.name);
    sport.attempts = Number(sport.attempts || 1);
    sport.finalists = Number(sport.finalists || 6);
  });
  merged.sportsDays.forEach((day) => {
    day.maxSectionScore = normalizePositiveInteger(day.maxSectionScore, 8);
  });
  if (!source.meta?.participantsScopedBySport || merged.participants.some((participant) => !participant.sportId)) {
    merged.participants = [];
    merged.relayTeams = [];
    merged.results = [];
    merged.attempts = [];
    merged.rankings = [];
  }
  merged.meta.participantsScopedBySport = true;
  ensureLockedAdminUser(merged);
  return merged;
}

export function ensureLockedAdminUser(targetDb) {
  let locked = targetDb.users.find((user) => user.id === LOCKED_ADMIN_ID) ||
    targetDb.users.find((user) => user.username?.toLowerCase() === LOCKED_ADMIN_USER.username);

  if (!locked) {
    locked = { ...LOCKED_ADMIN_USER, createdAt: new Date().toISOString() };
    targetDb.users.unshift(locked);
  } else {
    Object.assign(locked, LOCKED_ADMIN_USER, { createdAt: locked.createdAt || new Date().toISOString() });
  }

  targetDb.users.forEach((user) => {
    if (user !== locked && user.username?.toLowerCase() === LOCKED_ADMIN_USER.username) {
      user.username = `${user.username}_${user.id.slice(-4)}`;
    }
  });
}

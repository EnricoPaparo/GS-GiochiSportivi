import { normalizePositiveInteger } from "../utils/numbers.js";
import { emptyDb } from "./schema.js";

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
  merged.users = [];
  return merged;
}

import { saveDb as persistDb } from "../data/repository.js";
import { db, state } from "../state.js";
import { id } from "../utils/ids.js";

function saveDb() {
  return persistDb(db);
}

function isLowerValueBetter(sport) {
  return sport.name === "Velocita" || sport.name === "Resistenza";
}

export function getAttempt(sportId, participantId, phase, attemptIndex) {
  return db.attempts.find((attempt) =>
    attempt.sportId === sportId &&
    attempt.participantId === participantId &&
    attempt.phase === phase &&
    attempt.attemptIndex === attemptIndex
  );
}

export function upsertAttempt({ sportId, participantId, phase, attemptIndex, status, value }) {
  let attempt = getAttempt(sportId, participantId, phase, attemptIndex);
  if (!attempt) {
    attempt = { id: id("attempt"), dayId: state.selectedDayId, sportId, participantId, phase, attemptIndex, status: "value", value: "" };
    db.attempts.push(attempt);
  }
  if (status !== undefined) {
    attempt.status = status;
    if (status !== "value") attempt.value = "";
  }
  if (value !== undefined) attempt.value = value;
  return saveDb();
}

export function getTeamResult(teamId) {
  return db.results.find((result) => result.targetType === "team" && result.targetId === teamId);
}

export function upsertTeamResult(teamId, patch) {
  const team = db.relayTeams.find((item) => item.id === teamId);
  let result = getTeamResult(teamId);
  if (!result) {
    result = {
      id: id("result"),
      dayId: team.dayId,
      sportId: team.sportId,
      phase: "relay",
      targetType: "team",
      targetId: teamId,
      status: "value",
      value: ""
    };
    db.results.push(result);
  }
  Object.assign(result, patch);
  if (result.status !== "value") result.value = "";
  return saveDb();
}

export function getFinalResult(sportId, participantId) {
  return db.results.find((result) =>
    result.sportId === sportId &&
    result.phase === "final" &&
    result.targetType === "participant" &&
    result.targetId === participantId
  );
}

export function upsertFinalResult(sportId, participantId, patch) {
  let result = getFinalResult(sportId, participantId);
  if (!result) {
    result = {
      id: id("result"),
      dayId: state.selectedDayId,
      sportId,
      targetType: "participant",
      targetId: participantId,
      phase: "final",
      status: "value",
      value: ""
    };
    db.results.push(result);
  }
  Object.assign(result, patch);
  if (result.status !== "value") result.value = "";
  return saveDb();
}

export function bestParticipantResult(sport, participant, phase) {
  const attempts = db.attempts.filter((attempt) =>
    attempt.sportId === sport.id &&
    attempt.participantId === participant.id &&
    attempt.phase === phase
  );
  const values = attempts
    .filter((attempt) => attempt.status === "value" && attempt.value !== "")
    .map((attempt) => Number(attempt.value))
    .filter(Number.isFinite);
  const invalid = attempts.find((attempt) => attempt.status === "retired" || attempt.status === "disqualified") ||
    attempts.find((attempt) => attempt.status === "null");
  if (values.length) {
    const value = isLowerValueBetter(sport) ? Math.min(...values) : Math.max(...values);
    return { value, status: "value" };
  }
  if (invalid) return { value: null, status: invalid.status };
  return { value: null, status: "missing" };
}

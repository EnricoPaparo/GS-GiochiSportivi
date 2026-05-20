import { SEXES } from "../constants.js";
import { db } from "../state.js";
import { naturalCompare } from "../utils/sorting.js";
import { getSections, getYears } from "./days.js";
import { getSportParticipants } from "./participants.js";
import { getAttempt, getFinalResult, getTeamResult } from "./results.js";
import { getEffectiveSpeedFinalists } from "./rankings.js";

export function isAttemptComplete(attempt) {
  if (!attempt) return false;
  if (attempt.status === "retired" || attempt.status === "disqualified") return true;
  return attempt.status === "value" && attempt.value !== "";
}

export function isResultComplete(result) {
  if (!result) return false;
  if (result.status === "retired" || result.status === "disqualified") return true;
  return result.status === "value" && result.value !== "";
}

export function getCompletionPhase(sport) {
  return sport.name === "Velocita" ? "qualification" : "standard";
}

export function isParticipantSportComplete(participant, sport, phase = getCompletionPhase(sport)) {
  return Array.from({ length: sport.attempts }, (_, index) =>
    isAttemptComplete(getAttempt(sport.id, participant.id, phase, index + 1))
  ).every(Boolean);
}

export function getRelayTeamsForSport(sport) {
  return db.relayTeams.filter((team) => team.dayId === sport.dayId && team.sportId === sport.id);
}

export function getSpeedFinalistParticipants(sport) {
  return getYears(sport.dayId).flatMap((year) =>
    SEXES.flatMap((sex) => getEffectiveSpeedFinalists(sport, year.id, sex.value).map((item) => item.participant))
  );
}

export function isSpeedFinalComplete(participant, sport) {
  return isResultComplete(getFinalResult(sport.id, participant.id));
}

export function getSportProgress(sport, phase = null) {
  if (sport.name === "Staffetta") {
    const teams = getRelayTeamsForSport(sport);
    return {
      total: teams.length,
      completed: teams.filter((team) => isResultComplete(getTeamResult(team.id))).length
    };
  }

  if (sport.name === "Velocita" && phase === "finals") {
    const finalists = getSpeedFinalistParticipants(sport);
    return {
      total: finalists.length,
      completed: finalists.filter((participant) => isSpeedFinalComplete(participant, sport)).length
    };
  }

  const participants = getSportParticipants(sport);
  return {
    total: participants.length,
    completed: participants.filter((participant) => isParticipantSportComplete(participant, sport, sport.name === "Velocita" ? "qualification" : "standard")).length
  };
}

export function getMissingProofRows(dayId, sportWidgets) {
  return sportWidgets
    .flatMap((widget) => getIncompleteSectionRows(dayId, widget))
    .filter((row) => row.incomplete > 0)
    .sort((a, b) =>
      a.sport.localeCompare(b.sport) ||
      naturalCompare(a.year, b.year) ||
      naturalCompare(a.section, b.section) ||
      a.sex.localeCompare(b.sex)
    );
}

export function getIncompleteSectionRows(dayId, widget) {
  const { sport, phase, label } = widget;
  if (sport.name === "Velocita" && phase === "finals") {
    return getYears(dayId).flatMap((year) => SEXES.map((sex) => {
      const finalists = getEffectiveSpeedFinalists(sport, year.id, sex.value).map((item) => item.participant);
      return {
        sport: label,
        year: year.label,
        section: "",
        sex: sex.label,
        incomplete: finalists.filter((participant) => !isSpeedFinalComplete(participant, sport)).length
      };
    }));
  }

  return getYears(dayId).flatMap((year) =>
    getSections(year.id).flatMap((section) => SEXES.map((sex) => {
      if (sport.name === "Staffetta") {
        const teams = db.relayTeams.filter((team) =>
          team.dayId === dayId &&
          team.sportId === sport.id &&
          team.yearId === year.id &&
          team.sectionId === section.id &&
          team.sex === sex.value
        );
        return {
          sport: label,
          year: year.label,
          section: section.label,
          sex: sex.label,
          incomplete: teams.filter((team) => !isResultComplete(getTeamResult(team.id))).length
        };
      }

      const participants = db.participants.filter((participant) =>
          participant.dayId === dayId &&
          participant.sportId === sport.id &&
          participant.yearId === year.id &&
          participant.sectionId === section.id &&
          participant.sex === sex.value
        );
      const completionPhase = sport.name === "Velocita" ? "qualification" : "standard";
      return {
        sport: label,
        year: year.label,
        section: section.label,
        sex: sex.label,
        incomplete: participants.filter((participant) => !isParticipantSportComplete(participant, sport, completionPhase)).length
      };
    }))
  );
}

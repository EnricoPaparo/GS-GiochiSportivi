import { id } from "../utils/ids.js";
import { db } from "../state.js";

const SPORT_WIDGET_ORDER = {
  Vortex: 1,
  "Salto in lungo": 2,
  Resistenza: 3,
  "Velocita:qualifications": 4,
  "Velocita:finals": 5,
  Staffetta: 6
};

export function normalizeSportName(name) {
  return name === "Velocità" ? "Velocita" : name;
}

export function displaySportName(name) {
  return name === "Velocita" ? "Velocità" : name;
}

export function getSport(sportId) {
  return db.sports.find((sport) => sport.id === sportId);
}

export function getDaySportWidgets(sports) {
  return sports.flatMap((sport) => {
    if (sport.name !== "Velocita") return [{ sport, label: displaySportName(sport.name), phase: null }];
    return [
      { sport, label: "Velocita Qualifiche", phase: "qualifications" },
      { sport, label: "Velocita Finali", phase: "finals" }
    ];
  }).sort((a, b) => {
    const left = SPORT_WIDGET_ORDER[`${a.sport.name}:${a.phase}`] ?? SPORT_WIDGET_ORDER[a.sport.name] ?? 99;
    const right = SPORT_WIDGET_ORDER[`${b.sport.name}:${b.phase}`] ?? SPORT_WIDGET_ORDER[b.sport.name] ?? 99;
    return left - right;
  });
}

function getDefaultAttempts(sportName) {
  const normalizedName = normalizeSportName(sportName);

  if (normalizedName === "Velocita" || normalizedName === "Staffetta" || normalizedName === "Resistenza") {
    return 1;
  }

  if (normalizedName === "Salto in lungo" || normalizedName === "Vortex") {
    return 2;
  }

  return 3;
}

export function addDefaultSports(dayId, selectedSports) {
  selectedSports.forEach((sportName) => {
    db.sports.push({
      id: id("sport"),
      dayId,
      name: normalizeSportName(sportName),
      attempts: getDefaultAttempts(sportName),
      finalists: 6
    });
  });
}

export function createSport(dayId, sportName) {
  db.sports.push({
    id: id("sport"),
    dayId,
    name: sportName,
    attempts: getDefaultAttempts(sportName),
    finalists: 6
  });
}

export function deleteSport(sportId) {
  const participantIds = db.participants.filter((participant) => participant.sportId === sportId).map((participant) => participant.id);
  db.sports = db.sports.filter((sport) => sport.id !== sportId);
  db.participants = db.participants.filter((participant) => participant.sportId !== sportId);
  db.attempts = db.attempts.filter((attempt) => attempt.sportId !== sportId);
  db.results = db.results.filter((result) => result.sportId !== sportId && !participantIds.includes(result.targetId));
  db.relayTeams = db.relayTeams.filter((team) => team.sportId !== sportId);
  db.rankings = db.rankings.filter((ranking) => ranking.sportId !== sportId);
}

import { db } from "../state.js";
import { naturalCompare } from "../utils/sorting.js";

export function getDay(dayId) {
  return db.sportsDays.find((day) => day.id === dayId);
}

export function getYears(dayId) {
  return db.years
    .filter((year) => year.dayId === dayId)
    .sort((a, b) => naturalCompare(a.label, b.label));
}

export function getSections(yearId) {
  return db.sections
    .filter((section) => section.yearId === yearId)
    .sort((a, b) => naturalCompare(a.label, b.label));
}

export function getSection(sectionId) {
  return db.sections.find((section) => section.id === sectionId);
}

export function cleanupDay(dayId) {
  const sportIds = db.sports.filter((sport) => sport.dayId === dayId).map((sport) => sport.id);
  db.sportsDays = db.sportsDays.filter((day) => day.id !== dayId);
  db.sports = db.sports.filter((sport) => sport.dayId !== dayId);
  db.years = db.years.filter((year) => year.dayId !== dayId);
  db.sections = db.sections.filter((section) => section.dayId !== dayId);
  db.participants = db.participants.filter((participant) => participant.dayId !== dayId);
  db.relayTeams = db.relayTeams.filter((team) => team.dayId !== dayId);
  db.attempts = db.attempts.filter((attempt) => !sportIds.includes(attempt.sportId));
  db.results = db.results.filter((result) => !sportIds.includes(result.sportId));
  db.rankings = db.rankings.filter((ranking) => ranking.dayId !== dayId);
}

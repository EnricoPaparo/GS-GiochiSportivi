import { SEXES } from "../constants.js";
import { db, state } from "../state.js";
import { naturalCompare } from "../utils/sorting.js";
import { getSections } from "./days.js";

export function countParticipants({ dayId = state.selectedDayId, sportId, yearId, sectionId, sex } = {}) {
  return db.participants.filter((participant) =>
    (!dayId || participant.dayId === dayId) &&
    (!sportId || participant.sportId === sportId) &&
    (!yearId || participant.yearId === yearId) &&
    (!sectionId || participant.sectionId === sectionId) &&
    (!sex || participant.sex === sex)
  ).length;
}

export function getSportParticipants(sport) {
  return db.participants.filter((participant) =>
    participant.dayId === sport.dayId &&
    participant.sportId === sport.id
  );
}

export function getParticipantsForContext() {
  return db.participants.filter((participant) =>
    participant.dayId === state.selectedDayId &&
    participant.sportId === state.selectedSportId &&
    participant.yearId === state.filters.yearId &&
    participant.sectionId === state.filters.sectionId &&
    participant.sex === state.filters.sex
  );
}

export function orderParticipants(participants) {
  const sorted = [...participants].sort((a, b) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  );
  if (!state.randomOrder) return sorted;
  return sorted.map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
}

export function orderRelayTeams(teams) {
  const sorted = [...teams].sort((a, b) => naturalCompare(a.name, b.name));
  if (!state.randomOrder) return sorted;
  return sorted.map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
}

export function ensureValidFilter(years, includeSection) {
  if (!years.some((year) => year.id === state.filters.yearId)) {
    state.filters.yearId = years[0]?.id || "";
  }
  if (includeSection) {
    const sections = getSections(state.filters.yearId);
    if (!sections.some((section) => section.id === state.filters.sectionId)) {
      state.filters.sectionId = sections[0]?.id || "";
    }
  } else {
    state.filters.sectionId = "";
  }
  if (!SEXES.some((sex) => sex.value === state.filters.sex)) state.filters.sex = "M";
}

import { ROLES } from "../constants.js";
import { id } from "../utils/ids.js";
import { normalizePositiveInteger } from "../utils/numbers.js";
import { saveDb as persistDb } from "../data/repository.js";
import { db, state } from "../state.js";
import { setSession, updateSession } from "../auth/authService.js";
import { canAdmin, canEditResults, isGuest, isLockedUser } from "../auth/permissions.js";
import { cleanupDay, getDay, getSections, getYears } from "../domain/days.js";
import { addDefaultSports, createSport, deleteSport, getSport, normalizeSportName } from "../domain/sports.js";
import { upsertAttempt, upsertFinalResult, upsertTeamResult } from "../domain/results.js";
import { loginWithEmailPassword, mapFirebaseUserToSession } from "../auth/firebaseAuthService.js";
import { getFirebaseUserProfile } from "../auth/firebaseUserService.js";
export function bindEventHandlers(app, render) {
function saveDb() {
  persistDb(db);
}

function toast(message) {
  const previous = document.querySelector(".toast");
  if (previous) previous.remove();
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2600);
}

function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

app.addEventListener("submit", async (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  const action = form.dataset.action;
  const data = serializeForm(form);

if (action === "firebase-login") {
  try {
    const firebaseUser = await loginWithEmailPassword(
      data.email,
      data.password
    );

    const profile = await getFirebaseUserProfile(firebaseUser.uid);

    if (!profile) {
      toast("Profilo Firestore non trovato.");
      return;
    }

    setSession({
      ...mapFirebaseUserToSession(firebaseUser),
      provider: "firebase",
      role: profile.role
    });

    state.view = "dashboard";

    toast("Accesso Firebase effettuato.");

    render();
  } catch (error) {
    console.error(error);
    toast("Login Firebase non riuscito.");
  }

  return;
}

  if (action === "login") {
    const user = db.users.find((item) => item.username === data.username && item.password === data.password);
    if (!user) return toast("Credenziali non valide.");
    setSession(user);
    state.view = "dashboard";
    render();
  }

  if (action === "register" && canAdmin()) {
    if (db.users.some((user) => user.username === data.username)) return toast("Username già esistente.");
    db.users.push({
      id: id("user"),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      username: data.username.trim(),
      password: data.password,
      role: data.role,
      createdAt: new Date().toISOString()
    });
    saveDb();
    toast("Utente creato.");
    form.reset();
    render();
  }

  if (action === "create-day" && canAdmin()) {
    const maxScoreValue = String(data.maxSectionScore || "").trim();
    if (!/^[1-9]\d*$/.test(maxScoreValue)) {
      return toast("Il punteggio massimo deve essere un numero intero positivo.");
    }
    const maxSectionScore = Number.parseInt(maxScoreValue, 10);
    const dayId = id("day");
    db.sportsDays.push({
      id: dayId,
      title: data.title.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      address: data.address.trim(),
      maxSectionScore,
      createdAt: new Date().toISOString()
    });
    const selectedSports = new FormData(form).getAll("sports").map(normalizeSportName);
    addDefaultSports(dayId, selectedSports);
    saveDb();
    state.selectedDayId = dayId;
    state.view = "day";
    render();
  }

  if (action === "update-day" && canAdmin()) {
    const day = getDay(form.dataset.dayId);
    const maxScoreValue = String(data.maxSectionScore || "").trim();
    if (!/^[1-9]\d*$/.test(maxScoreValue)) {
      return toast("Il punteggio massimo deve essere un numero intero positivo.");
    }
    const maxSectionScore = Number.parseInt(maxScoreValue, 10);
    Object.assign(day, {
      title: data.title.trim(),
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      address: data.address.trim(),
      maxSectionScore
    });
    saveDb();
    toast("Giornata aggiornata.");
    render();
  }

  if (action === "add-year" && canAdmin()) {
    const label = data.label.trim();
    if (!label) return;
    if (getYears(form.dataset.dayId).some((year) => year.label.toLowerCase() === label.toLowerCase())) return toast("Anno già presente.");
    db.years.push({ id: id("year"), dayId: form.dataset.dayId, label });
    saveDb();
    render();
  }

  if (action === "add-section" && canAdmin()) {
    const year = db.years.find((item) => item.id === form.dataset.yearId);
    const label = data.label.trim();
    if (!label) return;
    if (getSections(year.id).some((section) => section.label.toLowerCase() === label.toLowerCase())) return toast("Sezione già presente in questo anno.");
    db.sections.push({ id: id("section"), dayId: year.dayId, yearId: year.id, label });
    saveDb();
    render();
  }

  if (action === "add-participant" && canEditResults()) {
    if (!state.filters.yearId || !state.filters.sectionId) return toast("Seleziona anno e sezione.");
    db.participants.push({
      id: id("participant"),
      dayId: state.selectedDayId,
      sportId: state.selectedSportId,
      yearId: state.filters.yearId,
      sectionId: state.filters.sectionId,
      sex: state.filters.sex,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim()
    });
    saveDb();
    form.reset();
    render();
  }

  if (action === "add-team" && canEditResults()) {
    if (!state.filters.yearId || !state.filters.sectionId) return toast("Seleziona anno e sezione.");
    db.relayTeams.push({
      id: id("team"),
      dayId: state.selectedDayId,
      sportId: form.dataset.sportId,
      yearId: state.filters.yearId,
      sectionId: state.filters.sectionId,
      sex: state.filters.sex,
      name: data.name.trim(),
      participantIds: []
    });
    saveDb();
    render();
  }
});

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action } = target.dataset;

  if (action === "guest-login") {
    setSession({ id: "guest", username: "ospite", role: ROLES.GUEST });
    state.view = "dashboard";
    render();
  }

  if (action === "logout") {
    state.profileOpen = false;
    setSession(null);
    state.view = "auth";
    render();
  }

  if (action === "go-dashboard") {
    state.view = "dashboard";
    state.modalTeamId = null;
    state.teamInfoId = null;
    state.profileOpen = false;
    render();
  }

  if (action === "toggle-profile") {
    state.profileOpen = !state.profileOpen;
    render();
  }

  if (action === "dashboard-section" && canAdmin()) {
    state.dashboardSection = target.dataset.section;
    state.profileOpen = false;
    render();
  }

  if (action === "toggle-create-day") {
    document.querySelector("#create-day-form")?.classList.toggle("hidden");
  }

  if (action === "open-day") {
    state.selectedDayId = target.dataset.dayId;
    state.view = "day";
    state.modalTeamId = null;
    state.teamInfoId = null;
    state.profileOpen = false;
    resetFilters();
    render();
  }

  if (action === "edit-day" && canAdmin()) {
    state.selectedDayId = target.dataset.dayId;
    state.view = "day-edit";
    state.modalTeamId = null;
    state.teamInfoId = null;
    resetFilters();
    render();
  }

  if (action === "open-sport") {
    state.selectedSportId = target.dataset.sportId;
    state.view = "sport";
    state.sportTab = isGuest() ? "rankings" : "proves";
    state.speedPhase = target.dataset.speedPhase || "qualifications";
    state.modalTeamId = null;
    state.teamInfoId = null;
    resetFilters();
    render();
  }

  if (action === "back-day") {
    state.view = "day";
    state.modalTeamId = null;
    state.teamInfoId = null;
    render();
  }

  if (action === "sport-tab") {
    state.sportTab = target.dataset.tab;
    state.modalTeamId = null;
    state.teamInfoId = null;
    render();
  }

  if (action === "toggle-random") {
    state.randomOrder = !state.randomOrder;
    render();
  }

  if (action === "scroll-relay-participants") {
    document.querySelector("#relay-participants")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (action === "open-team-modal" && canEditResults()) {
    state.modalTeamId = target.dataset.teamId;
    render();
  }

  if (action === "close-team-modal") {
    if (event.target.closest("[data-modal-panel]") && !event.target.closest(".icon-btn")) return;
    state.modalTeamId = null;
    render();
  }

  if (action === "open-team-info") {
    state.teamInfoId = target.dataset.teamId;
    render();
  }

  if (action === "close-team-info") {
    if (event.target.closest("[data-modal-panel]") && !event.target.closest(".icon-btn")) return;
    state.teamInfoId = null;
    render();
  }

  if (action === "delete-day" && canAdmin()) {
    if (!confirm("Eliminare questa giornata sportiva e tutti i dati collegati?")) return;
    cleanupDay(target.dataset.dayId);
    saveDb();
    state.view = "dashboard";
    render();
  }

  if (action === "delete-year" && canAdmin()) {
    const yearId = target.dataset.yearId;
    if (getSections(yearId).length > 0) return toast("Non puoi eliminare un anno che contiene sezioni.");
    if (!confirm("Eliminare questo anno?")) return;
    const sectionIds = getSections(yearId).map((section) => section.id);
    const participantIds = db.participants.filter((participant) => participant.yearId === yearId).map((participant) => participant.id);
    const teamIds = db.relayTeams.filter((team) => team.yearId === yearId || sectionIds.includes(team.sectionId)).map((team) => team.id);
    db.years = db.years.filter((year) => year.id !== yearId);
    db.sections = db.sections.filter((section) => section.yearId !== yearId);
    db.participants = db.participants.filter((participant) => participant.yearId !== yearId);
    db.relayTeams = db.relayTeams.filter((team) => team.yearId !== yearId && !sectionIds.includes(team.sectionId));
    db.attempts = db.attempts.filter((attempt) => !participantIds.includes(attempt.participantId));
    db.results = db.results.filter((result) => !participantIds.includes(result.targetId) && !teamIds.includes(result.targetId));
    saveDb();
    render();
  }

  if (action === "delete-section" && canAdmin()) {
    const sectionId = target.dataset.sectionId;
    if (db.participants.some((participant) => participant.sectionId === sectionId)) {
      return toast("Non puoi eliminare una sezione con studenti presenti.");
    }
    if (!confirm("Eliminare sezione e dati collegati?")) return;
    const participantIds = db.participants.filter((participant) => participant.sectionId === sectionId).map((participant) => participant.id);
    const teamIds = db.relayTeams.filter((team) => team.sectionId === sectionId).map((team) => team.id);
    db.sections = db.sections.filter((section) => section.id !== sectionId);
    db.participants = db.participants.filter((participant) => participant.sectionId !== sectionId);
    db.relayTeams = db.relayTeams.filter((team) => team.sectionId !== sectionId);
    db.attempts = db.attempts.filter((attempt) => !participantIds.includes(attempt.participantId));
    db.results = db.results.filter((result) => !participantIds.includes(result.targetId) && !teamIds.includes(result.targetId));
    saveDb();
    render();
  }

  if (action === "delete-participant" && canEditResults()) {
    const participantId = target.dataset.participantId;
    const participant = db.participants.find((item) => item.id === participantId);
    const label = participant ? `${participant.firstName} ${participant.lastName}` : "questo studente";
    if (!confirm(`Eliminare ${label} da questo sport?`)) return;
    db.participants = db.participants.filter((participant) => participant.id !== participantId);
    db.attempts = db.attempts.filter((attempt) => attempt.participantId !== participantId);
    db.results = db.results.filter((result) => result.targetId !== participantId);
    db.relayTeams.forEach((team) => {
      team.participantIds = team.participantIds.filter((id) => id !== participantId);
    });
    saveDb();
    render();
  }

  if (action === "delete-team" && canEditResults()) {
    const teamId = target.dataset.teamId;
    const team = db.relayTeams.find((item) => item.id === teamId);
    const label = team ? team.name : "questa squadra";
    if (!confirm(`Eliminare ${label} dalla staffetta?`)) return;
    db.relayTeams = db.relayTeams.filter((team) => team.id !== teamId);
    db.results = db.results.filter((result) => result.targetId !== teamId);
    if (state.modalTeamId === teamId) state.modalTeamId = null;
    saveDb();
    render();
  }

  if (action === "delete-user" && canAdmin()) {
    const userId = target.dataset.userId;
    if (isLockedUser(userId)) return toast("Questo utente non puo essere modificato o eliminato.");
    if (userId === state.user.id) return toast("Non puoi eliminare l'utente attualmente in uso.");
    if (!confirm("Eliminare questo utente?")) return;
    db.users = db.users.filter((user) => user.id !== userId);
    saveDb();
    render();
  }
});

app.addEventListener("change", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action } = target.dataset;

  if (action === "filter-year") {
    state.filters.yearId = target.value;
    state.filters.sectionId = "";
    state.modalTeamId = null;
    render();
  }

  if (action === "filter-section") {
    state.filters.sectionId = target.value;
    state.modalTeamId = null;
    render();
  }

  if (action === "filter-sex") {
    state.filters.sex = target.value;
    state.modalTeamId = null;
    render();
  }

  if (action === "toggle-sport" && canAdmin()) {
    const sportName = normalizeSportName(target.dataset.sportName);
    const existing = db.sports.find((sport) => sport.dayId === target.dataset.dayId && sport.name === sportName);
    if (target.checked && !existing) createSport(target.dataset.dayId, sportName);
    if (!target.checked && existing) deleteSport(existing.id);
    saveDb();
    render();
  }

  if (action === "update-attempt-status" && canEditResults()) {
    upsertAttempt({
      sportId: target.dataset.sportId,
      participantId: target.dataset.participantId,
      phase: target.dataset.phase,
      attemptIndex: Number(target.dataset.attemptIndex),
      status: target.value
    });
    render();
  }

  if (action === "update-team-status" && canEditResults()) {
    upsertTeamResult(target.dataset.teamId, { status: target.value });
    render();
  }

  if (action === "update-final-status" && canEditResults()) {
    upsertFinalResult(target.dataset.sportId, target.dataset.participantId, { status: target.value });
    render();
  }

  if (action === "toggle-team-participant" && canEditResults()) {
    const team = db.relayTeams.find((item) => item.id === target.dataset.teamId);
    if (target.checked && !team.participantIds.includes(target.dataset.participantId)) {
      db.relayTeams
        .filter((item) =>
          item.id !== team.id &&
          item.dayId === team.dayId &&
          item.sportId === team.sportId &&
          item.yearId === team.yearId &&
          item.sectionId === team.sectionId &&
          item.sex === team.sex
        )
        .forEach((item) => {
          item.participantIds = item.participantIds.filter((id) => id !== target.dataset.participantId);
        });
      team.participantIds.push(target.dataset.participantId);
    }
    if (!target.checked) {
      team.participantIds = team.participantIds.filter((id) => id !== target.dataset.participantId);
    }
    saveDb();
    render();
  }

  if (action === "update-user" && canAdmin()) {
    updateUserField(target);
  }
});

app.addEventListener("input", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action } = target.dataset;

  if (action === "update-sport-attempts" && canAdmin()) {
    const sport = getSport(target.dataset.sportId);
    sport.attempts = Math.max(1, Number(target.value || 1));
    saveDb();
  }

  if (action === "update-sport-finalists" && canAdmin()) {
    const sport = getSport(target.dataset.sportId);
    sport.finalists = Math.max(1, Number(target.value || 1));
    saveDb();
  }

  if (action === "update-year" && canAdmin()) {
    const year = db.years.find((item) => item.id === target.dataset.yearId);
    const next = target.value.trim();
    if (next) {
      year.label = next;
      saveDb();
    }
  }

  if (action === "update-section" && canAdmin()) {
    const section = db.sections.find((item) => item.id === target.dataset.sectionId);
    const next = target.value.trim();
    const duplicate = getSections(section.yearId).some((item) => item.id !== section.id && item.label.toLowerCase() === next.toLowerCase());
    if (next && !duplicate) {
      section.label = next;
      saveDb();
    }
    if (duplicate) toast("Sezione duplicata nello stesso anno.");
  }

  if (action === "update-participant" && canEditResults()) {
    const participant = db.participants.find((item) => item.id === target.dataset.participantId);
    participant[target.dataset.field] = target.value;
    saveDb();
  }

  if (action === "update-attempt-value" && canEditResults()) {
    upsertAttempt({
      sportId: target.dataset.sportId,
      participantId: target.dataset.participantId,
      phase: target.dataset.phase,
      attemptIndex: Number(target.dataset.attemptIndex),
      value: target.value
    });
  }

  if (action === "update-team-name" && canEditResults()) {
    const team = db.relayTeams.find((item) => item.id === target.dataset.teamId);
    team.name = target.value;
    saveDb();
  }

  if (action === "update-team-value" && canEditResults()) {
    upsertTeamResult(target.dataset.teamId, { value: target.value, status: "value" });
  }

  if (action === "update-final-value" && canEditResults()) {
    upsertFinalResult(target.dataset.sportId, target.dataset.participantId, { value: target.value, status: "value" });
  }
});

function updateUserField(target) {
  const user = db.users.find((item) => item.id === target.dataset.userId);
  if (!user) return;
  if (isLockedUser(user)) {
    target.value = user[target.dataset.field];
    return toast("Questo utente non puo essere modificato o eliminato.");
  }
  const field = target.dataset.field;
  const next = target.value.trim();
  if (!next) {
    target.value = user[field];
    return toast("Il campo non può essere vuoto.");
  }
  if (field === "role" && user.id === state.user.id) {
    target.value = user.role;
    return toast("Non puoi cambiare il ruolo dell'utente attualmente in uso.");
  }
  if (field === "username" && db.users.some((item) => item.id !== user.id && item.username.toLowerCase() === next.toLowerCase())) {
    target.value = user.username;
    return toast("Username già esistente.");
  }
  user[field] = next;
  if (user.id === state.user.id && field === "username") {
    updateSession({ username: next });
  }
  saveDb();
  toast("Utente aggiornato.");
  render();
}

function resetFilters() {
  state.filters = { yearId: "", sectionId: "", sex: "M" };
  state.randomOrder = false;
}


}

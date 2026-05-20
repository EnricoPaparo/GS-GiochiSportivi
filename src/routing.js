import { isGuest } from "./auth/permissions.js";
import { getDay } from "./domain/days.js";
import { getSport } from "./domain/sports.js";
import { state } from "./state.js";

const ROUTED_VIEWS = new Set(["dashboard", "day", "day-edit", "sport"]);

function currentRouteParams() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

function normalizeRouteView(view) {
  return ROUTED_VIEWS.has(view) ? view : "dashboard";
}

export function restoreRouteFromUrl() {
  if (!state.user) return;

  const params = currentRouteParams();
  const view = normalizeRouteView(params.get("view"));
  const dayId = params.get("day");
  const sportId = params.get("sport");

  state.dashboardSection = params.get("section") || state.dashboardSection || "days";
  state.modalTeamId = null;
  state.teamInfoId = null;
  state.profileOpen = false;

  if (view === "day" || view === "day-edit") {
    if (!getDay(dayId)) {
      state.view = "dashboard";
      state.selectedDayId = null;
      state.selectedSportId = null;
      return;
    }

    state.view = view;
    state.selectedDayId = dayId;
    state.selectedSportId = null;
    return;
  }

  if (view === "sport") {
    const sport = getSport(sportId);
    if (!getDay(dayId) || !sport || sport.dayId !== dayId) {
      state.view = "dashboard";
      state.selectedDayId = null;
      state.selectedSportId = null;
      return;
    }

    state.view = "sport";
    state.selectedDayId = dayId;
    state.selectedSportId = sportId;
    state.sportTab = isGuest() ? "rankings" : params.get("tab") || state.sportTab || "proves";
    state.speedPhase = params.get("phase") || state.speedPhase || "qualifications";
    state.filters = {
      yearId: params.get("year") || "",
      sectionId: params.get("class") || "",
      sex: params.get("sex") || "M"
    };
    return;
  }

  state.view = "dashboard";
  state.selectedDayId = null;
  state.selectedSportId = null;
}

export function syncRouteToUrl() {
  if (!state.user) return;

  const params = new URLSearchParams();
  params.set("view", state.view === "auth" ? "dashboard" : state.view);

  if (state.view === "dashboard") {
    params.set("section", state.dashboardSection || "days");
  }

  if ((state.view === "day" || state.view === "day-edit" || state.view === "sport") && state.selectedDayId) {
    params.set("day", state.selectedDayId);
  }

  if (state.view === "sport" && state.selectedSportId) {
    params.set("sport", state.selectedSportId);
    params.set("tab", isGuest() ? "rankings" : state.sportTab || "proves");
    params.set("phase", state.speedPhase || "qualifications");
    if (state.filters.yearId) params.set("year", state.filters.yearId);
    if (state.filters.sectionId) params.set("class", state.filters.sectionId);
    if (state.filters.sex) params.set("sex", state.filters.sex);
  }

  const nextHash = `#${params.toString()}`;
  if (window.location.hash !== nextHash) {
    window.history.replaceState(null, "", nextHash);
  }
}

export function bindRouteChange(render) {
  window.addEventListener("hashchange", () => {
    restoreRouteFromUrl();
    render();
  });
}

import { state } from "../state.js";
import { getDay } from "../domain/days.js";
import { getSport } from "../domain/sports.js";
import { renderAuth } from "./renderAuth.js";
import { renderDashboard } from "./renderDashboard.js";
import { renderDay, renderDayEdit } from "./renderDay.js";
import { renderSport } from "./renderSport.js";
import { renderTopbar } from "./renderTopbar.js";
export function render(app) {
  if (!state.user) {
    state.view = "auth";
    app.innerHTML = renderAuth();
    return;
  }

  if ((state.view === "day" || state.view === "day-edit") && !getDay(state.selectedDayId)) {
    state.view = "dashboard";
    state.selectedDayId = null;
  }
  if (state.view === "sport" && (!getDay(state.selectedDayId) || !getSport(state.selectedSportId))) {
    state.view = "dashboard";
  }

  app.innerHTML = `
    <div class="app-shell">
      ${renderTopbar()}
      <main class="container">
        ${state.view === "dashboard" ? renderDashboard() : ""}
        ${state.view === "day" ? renderDay() : ""}
        ${state.view === "day-edit" ? renderDayEdit() : ""}
        ${state.view === "sport" ? renderSport() : ""}
      </main>
    </div>
  `;
}




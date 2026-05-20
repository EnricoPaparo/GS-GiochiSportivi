import { state } from "../state.js";
import { canAdmin } from "../auth/permissions.js";
import { renderDaysSection } from "./renderDays.js";
import { renderUsersSection } from "./renderUsers.js";

export function renderDashboard() {
  const activeSection = canAdmin() ? state.dashboardSection : "days";
  return `
    ${canAdmin() ? renderDashboardNav(activeSection) : ""}
    ${activeSection === "users" ? renderUsersSection() : renderDaysSection()}
  `;
}

function renderDashboardNav(activeSection) {
  return `
    <section class="dashboard-nav">
      <button class="nav-tile ${activeSection === "days" ? "active" : ""}" data-action="dashboard-section" data-section="days">
        <span class="tile-icon calendar-icon" aria-hidden="true"></span>
        <span>
          <strong>Dashboard Giornate</strong>
          <small>Giornate sportive, sport e configurazioni</small>
        </span>
      </button>
      <button class="nav-tile ${activeSection === "users" ? "active" : ""}" data-action="dashboard-section" data-section="users">
        <span class="tile-icon users-icon" aria-hidden="true"></span>
        <span>
          <strong>Strumenti admin</strong>
          <small>Backup, restore e sincronizzazione Firestore</small>
        </span>
      </button>
    </section>
  `;
}

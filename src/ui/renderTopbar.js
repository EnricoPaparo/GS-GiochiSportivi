import { state } from "../state.js";
import { escapeHtml } from "../utils/html.js";

export function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">GS</span>
        <span>Giornate Sportive</span>
      </div>
      <div class="userbar">
        ${state.view !== "dashboard" ? `<button class="btn secondary tiny" data-action="go-dashboard">Dashboard</button>` : ""}
        <div class="profile-menu">
          <button class="profile-button" type="button" aria-label="Profilo utente" data-action="toggle-profile">
            <span class="profile-icon" aria-hidden="true"></span>
          </button>
          ${state.profileOpen ? `
            <div class="profile-popover">
              <div class="profile-line">
                <span>User:</span>
                <strong>${escapeHtml(state.user.username)}</strong>
              </div>
              <div class="profile-line">
                <span>Utenza:</span>
                <strong>${escapeHtml(state.user.role)}</strong>
              </div>
              <button class="btn ghost tiny" data-action="logout">Esci</button>
            </div>
          ` : ""}
        </div>
      </div>
    </header>
  `;
}

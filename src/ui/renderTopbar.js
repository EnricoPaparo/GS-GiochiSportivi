import { canAdmin } from "../auth/permissions.js";
import { getFirebaseUsageSummary } from "../data/firebaseUsage.js";
import { db, state } from "../state.js";
import { escapeHtml } from "../utils/html.js";

function renderUsageRow(label, used, quota, note = "") {
  const remaining = Math.max(quota - used, 0);
  return `
    <div class="usage-row">
      <span>${label}</span>
      <strong>${used}/${quota}</strong>
      <small>Restano ${remaining}${note ? ` ${note}` : ""}</small>
    </div>
  `;
}

function renderAdminInfoPopover() {
  const usage = getFirebaseUsageSummary(db, state.firebaseReadsThisSession);
  const guestsEnabled = db.meta?.guestsEnabled !== false;
  return `
    <div class="profile-popover admin-info-popover">
      <div class="profile-line">
        <span>Firebase</span>
        <strong>Uso giornaliero stimato</strong>
      </div>
      <div class="usage-grid">
        ${renderUsageRow("Letture", usage.reads, usage.quotas.reads, `(${usage.sessionReads} in questa sessione)`)}
        ${renderUsageRow("Scritture", usage.writes, usage.quotas.writes)}
        ${renderUsageRow("Deletes", usage.deletes, usage.quotas.deletes)}
      </div>
      <p class="fineprint">Stima interna senza letture extra. I valori ufficiali restano quelli della console Firebase.</p>
      <button class="btn ${guestsEnabled ? "danger" : "secondary"} tiny" data-action="toggle-guest-access">
        ${guestsEnabled ? "Blocca ospiti" : "Permetti ospiti"}
      </button>
    </div>
  `;
}

export function renderTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">GS</span>
        <span>Giornate Sportive</span>
      </div>
      <div class="userbar">
        ${state.view !== "dashboard" ? `<button class="btn secondary tiny" data-action="go-dashboard">Dashboard</button>` : ""}
        ${canAdmin() ? `
          <div class="profile-menu">
            <button class="profile-button" type="button" aria-label="Informazioni Firebase" data-action="toggle-admin-info">
              <span class="info-icon" aria-hidden="true">i</span>
            </button>
            ${state.adminInfoOpen ? renderAdminInfoPopover() : ""}
          </div>
        ` : ""}
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

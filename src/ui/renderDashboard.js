import { ROLES, SPORTS } from "../constants.js";
import { db, state } from "../state.js";
import { canAdmin, isLockedUser } from "../auth/permissions.js";
import { formatDate, today } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";
import { compareSportsDaysByDateDesc } from "../utils/sorting.js";
import { displaySportName } from "../domain/sports.js";
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
          <strong>Utenze</strong>
          <small>Creazione, modifica e cancellazione utenti</small>
        </span>
      </button>
    </section>
  `;
}

function renderDaysSection() {
  const days = [...db.sportsDays].sort(compareSportsDaysByDateDesc);
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Dashboard Giornate</p>
          <h2>Giornate sportive</h2>
        </div>
        ${canAdmin() ? `<button class="btn" data-action="toggle-create-day">Nuova giornata</button>` : ""}
      </div>
      ${canAdmin() ? renderCreateDayForm() : ""}
      ${days.length ? `
        <div class="days-list">
          ${days.map(renderDayCard).join("")}
        </div>
      ` : `<div class="empty">Nessuna giornata sportiva presente.</div>`}
    </section>
  `;
}

function renderUsersSection() {
  const users = [...db.users].sort((a, b) => a.username.localeCompare(b.username));
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Utenze</p>
          <h2>Gestione utenti</h2>
        </div>
        <span class="role-pill">${users.length} utenti</span>
      </div>
      <form data-action="register" style="margin-bottom: 18px;">
        <h3 style="margin-top: 0;">Nuovo utente</h3>
        <div class="form-grid three">
          <div class="field">
            <label for="reg-firstName">Nome</label>
            <input id="reg-firstName" name="firstName" required>
          </div>
          <div class="field">
            <label for="reg-lastName">Cognome</label>
            <input id="reg-lastName" name="lastName" required>
          </div>
          <div class="field">
            <label for="reg-username">Username</label>
            <input id="reg-username" name="username" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="reg-password">Password</label>
            <input id="reg-password" name="password" type="password" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="reg-role">Tipo utente</label>
            <select id="reg-role" name="role">
              <option>${ROLES.TEACHER}</option>
              <option>${ROLES.ADMIN}</option>
              <option>${ROLES.GUEST}</option>
            </select>
          </div>
        </div>
        <div class="inline" style="margin-top: 14px;">
          <button class="btn" type="submit">Crea utente</button>
        </div>
      </form>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cognome</th>
              <th>Nome</th>
              <th>Username</th>
              <th>Password</th>
              <th>Ruolo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(renderUserRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderUserRow(user) {
  const isCurrent = state.user?.id === user.id;
  const locked = isLockedUser(user);
  const disabled = locked ? "disabled" : "";
  return `
    <tr class="${locked ? "locked-user-row" : ""}">
      <td><input value="${escapeHtml(user.lastName)}" data-action="update-user" data-field="lastName" data-user-id="${user.id}" ${disabled}></td>
      <td><input value="${escapeHtml(user.firstName)}" data-action="update-user" data-field="firstName" data-user-id="${user.id}" ${disabled}></td>
      <td><input value="${escapeHtml(user.username)}" data-action="update-user" data-field="username" data-user-id="${user.id}" ${disabled}></td>
      <td><input value="${escapeHtml(user.password)}" data-action="update-user" data-field="password" data-user-id="${user.id}" ${disabled}></td>
      <td>
        <select data-action="update-user" data-field="role" data-user-id="${user.id}" ${isCurrent || locked ? "disabled" : ""}>
          <option ${user.role === ROLES.ADMIN ? "selected" : ""}>${ROLES.ADMIN}</option>
          <option ${user.role === ROLES.TEACHER ? "selected" : ""}>${ROLES.TEACHER}</option>
          <option ${user.role === ROLES.GUEST ? "selected" : ""}>${ROLES.GUEST}</option>
        </select>
      </td>
      <td>
        <button class="btn danger tiny" data-action="delete-user" data-user-id="${user.id}" ${isCurrent || locked ? "disabled" : ""}>Elimina</button>
        ${locked ? `<span class="status-pill">Bloccato</span>` : ""}
      </td>
    </tr>
  `;
}

function renderCreateDayForm() {
  return `
    <form class="panel hidden" id="create-day-form" data-action="create-day" style="margin-bottom: 18px;">
      <div class="form-grid three">
        <div class="field">
          <label>Titolo</label>
          <input name="title" required placeholder="Es. Giornata atletica">
        </div>
        <div class="field">
          <label>Data</label>
          <input name="date" type="date" value="${today()}" required>
        </div>
        <div class="field">
          <label>Indirizzo</label>
          <input name="address" required placeholder="Palestra o campo">
        </div>
        <div class="time-field-row">
          <div class="field">
            <label>Ora di inizio</label>
            <input name="startTime" type="time" value="09:00" required>
          </div>
          <div class="field">
            <label>Ora di fine</label>
            <input name="endTime" type="time" value="13:00" required>
          </div>
        </div>
        <div class="field">
          <label>Punteggio massimo classifica sezioni</label>
          <input name="maxSectionScore" type="number" min="1" step="1" value="8" required>
        </div>
      </div>
      <p class="inline-label" style="margin-top: 12px;">Sport presenti</p>
      <div class="check-grid">
        ${SPORTS.map((sport) => `
          <label class="check-item">
            <input type="checkbox" name="sports" value="${sport}" checked>
            ${displaySportName(sport)}
          </label>
        `).join("")}
      </div>
      <div class="inline" style="margin-top: 14px;">
        <button class="btn" type="submit">Crea giornata</button>
      </div>
    </form>
  `;
}

function renderDayCard(day) {
  const sports = db.sports.filter((sport) => sport.dayId === day.id);
  return `
    <article class="card">
      <div>
        <h3>${escapeHtml(day.title)}</h3>
        <p class="muted">${escapeHtml(day.address)}</p>
      </div>
      <div class="meta">
        <span class="pill">${formatDate(day.date)}</span>
        <span class="pill">${escapeHtml(day.startTime)}-${escapeHtml(day.endTime)}</span>
        <span class="pill">${sports.length} sport</span>
      </div>
      <div class="card-actions">
        <button class="btn" data-action="open-day" data-day-id="${day.id}">Apri</button>
        ${canAdmin() ? `
          <button class="icon-btn" title="Modifica giornata" aria-label="Modifica giornata" data-action="edit-day" data-day-id="${day.id}">✎</button>
          <button class="icon-btn danger-icon" title="Elimina giornata" aria-label="Elimina giornata" data-action="delete-day" data-day-id="${day.id}">×</button>
        ` : ""}
      </div>
    </article>
  `;
}



import { RESULT_STATES, ROLES, SEXES, SPORTS } from "../constants.js";
import { db, state } from "../state.js";
import { canAdmin, canEditResults, isGuest, isLockedUser } from "../auth/permissions.js";
import { formatDate, today } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";
import { formatMeasure, normalizePositiveInteger } from "../utils/numbers.js";
import { compareSportsDaysByDateDesc } from "../utils/sorting.js";
import { cleanupDay, getDay, getSection, getSections, getYears } from "../domain/days.js";
import { displaySportName, getDaySportWidgets, getSport } from "../domain/sports.js";
import { countParticipants, ensureValidFilter, getParticipantsForContext, getSportParticipants, orderParticipants, orderRelayTeams } from "../domain/participants.js";
import { getAttempt, getFinalResult, getTeamResult } from "../domain/results.js";
import { computeRanking, computeSectionStandings, getEffectiveSpeedFinalists, persistRanking } from "../domain/rankings.js";
import { getMissingProofRows, getSportProgress } from "../domain/progress.js";
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

function renderAuth() {
  return `
    <main class="auth-page">
      <section class="auth-panel">
        <p class="eyebrow">Scuola in movimento</p>
        <h1>Giornate sportive scolastiche</h1>
        <p>Gestisci prove, partecipanti, risultati e classifiche con accessi separati per amministratori, docenti e spettatori.</p>
        <div class="auth-actions">
          <button class="btn secondary" data-action="guest-login">Accedi come spettatore</button>
        </div>
      </section>
      <section class="auth-forms">
        <form class="panel" data-action="login">
          <div class="section-head">
            <h2>Login</h2>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="login-username">Username</label>
              <input id="login-username" name="username" autocomplete="username" required>
            </div>
            <div class="field">
              <label for="login-password">Password</label>
              <input id="login-password" name="password" type="password" autocomplete="current-password" required>
            </div>
          </div>
          <div class="inline" style="margin-top: 14px;">
            <button class="btn" type="submit">Accedi</button>
          </div>
        </form>
      </section>
    </main>
  `;
}

function renderLegacyTopbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">GS</span>
        <span>Giornate Sportive</span>
      </div>
      <div class="userbar">
        <span class="role-pill">${escapeHtml(state.user.username)} · ${escapeHtml(state.user.role)}</span>
        ${state.view !== "dashboard" ? `<button class="btn secondary tiny" data-action="go-dashboard">Dashboard</button>` : ""}
        <button class="btn ghost tiny" data-action="logout">Esci</button>
      </div>
    </header>
  `;
}

function renderDashboard() {
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

function renderDay() {
  const day = getDay(state.selectedDayId);
  const sports = db.sports.filter((sport) => sport.dayId === day.id);
  const sportWidgets = getDaySportWidgets(sports);
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Giornata sportiva</p>
          <h2>${escapeHtml(day.title)}</h2>
          <div class="meta" style="margin-top: 10px;">
            <span class="pill">${formatDate(day.date)}</span>
            <span class="pill">${escapeHtml(day.startTime)}-${escapeHtml(day.endTime)}</span>
            <span class="pill">${escapeHtml(day.address)}</span>
          </div>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Sport</p>
        </div>
      </div>
      ${sports.length ? `
        <div class="sport-widget-row">
          ${sportWidgets.map(renderSportDayCard).join("")}
        </div>
      ` : `<div class="empty">Configura almeno uno sport per questa giornata.</div>`}
    </section>
    ${sports.length ? renderSectionStandings(day, sportWidgets) : ""}
    ${sports.length ? renderIncompleteSummary(day, sportWidgets) : ""}
  `;
}

function renderSportDayCard(widget) {
  const progress = getSportProgress(widget.sport, widget.phase);
  const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
  return `
    <article class="card sport-card">
      <h3>${escapeHtml(widget.label)}</h3>
      <div class="progress-block" aria-label="Avanzamento ${escapeHtml(widget.label)} ${progress.completed} su ${progress.total}">
        <div class="progress-meta">
          <span>Prove svolte</span>
          <strong>${progress.completed}/${progress.total}</strong>
        </div>
        <div class="progress-track">
          <span class="progress-fill" style="width: ${percent}%"></span>
        </div>
      </div>
      <button class="btn" data-action="open-sport" data-sport-id="${widget.sport.id}" ${widget.phase ? `data-speed-phase="${widget.phase}"` : ""}>Apri sport</button>
    </article>
  `;
}

function renderIncompleteSummary(day, sportWidgets) {
  const rows = getMissingProofRows(day.id, sportWidgets);
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Prove mancanti</p>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sport</th>
              <th>Anno</th>
              <th>Sezione</th>
              <th>Sesso</th>
              <th>Contatore</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((row) => `
              <tr>
                <td>${escapeHtml(row.sport)}</td>
                <td>${escapeHtml(row.year)}</td>
                <td>${escapeHtml(row.section)}</td>
                <td>${escapeHtml(row.sex)}</td>
                <td><span class="pill">${row.incomplete}</span></td>
              </tr>
            `).join("") : `<tr><td colspan="5" class="muted">Nessuna prova mancante.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderSectionStandings(day, sportWidgets) {
  const standings = computeSectionStandings(day, sportWidgets);
  const maxRows = Math.max(0, ...standings.map(({ rows }) => rows.length));
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Classifica sezioni</p>
        </div>
      </div>
      <div class="section-standings-grid">
        ${standings.map(({ year, rows }) => `
          <section class="section-standing">
            <div class="row-head compact">
              <h3>Anno ${escapeHtml(year.label)}</h3>
            </div>
            <div class="table-wrap">
              <table class="compact-rank-table">
                <thead>
                  <tr>
                    <th>Posizione</th>
                    <th>Sezione</th>
                    <th>Punti</th>
                  </tr>
                </thead>
                <tbody>
                  ${maxRows ? Array.from({ length: maxRows }, (_, index) => rows[index] || null).map((row, index) => row ? `
                    <tr>
                      <td><span class="rank">${index + 1}</span></td>
                      <td>${escapeHtml(row.section)}</td>
                      <td><strong>${row.points}</strong></td>
                    </tr>
                  ` : `
                    <tr class="empty-rank-row" aria-hidden="true">
                      <td>&nbsp;</td>
                      <td></td>
                      <td></td>
                    </tr>
                  `).join("") : `<tr><td colspan="3" class="muted">Nessun punto assegnato.</td></tr>`}
                </tbody>
              </table>
            </div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function renderDayEdit() {
  const day = getDay(state.selectedDayId);
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Modifica giornata</p>
          <h2>${escapeHtml(day.title)}</h2>
        </div>
        <button class="btn secondary" data-action="open-day" data-day-id="${day.id}">Apri giornata</button>
      </div>
    </section>
    ${renderDayAdminConfig(day)}
  `;
}

function renderDayAdminConfig(day) {
  return `
    <div class="panel day-edit-main" style="margin-bottom: 18px;">
      <div class="row-head">
        <h3>Dati giornata</h3>
      </div>
      <form data-action="update-day" data-day-id="${day.id}">
        <div class="form-grid three">
          <div class="field">
            <label>Titolo</label>
            <input name="title" value="${escapeHtml(day.title)}" required>
          </div>
          <div class="field">
            <label>Data</label>
            <input name="date" type="date" value="${escapeHtml(day.date)}" required>
          </div>
          <div class="field">
            <label>Indirizzo</label>
            <input name="address" value="${escapeHtml(day.address)}" required>
          </div>
          <div class="time-field-row">
            <div class="field">
              <label>Ora di inizio</label>
              <input name="startTime" type="time" value="${escapeHtml(day.startTime)}" required>
            </div>
            <div class="field">
              <label>Ora di fine</label>
              <input name="endTime" type="time" value="${escapeHtml(day.endTime)}" required>
            </div>
          </div>
          <div class="field">
            <label>Punteggio massimo classifica sezioni</label>
            <input name="maxSectionScore" type="number" min="1" step="1" value="${normalizePositiveInteger(day.maxSectionScore, 8)}" required>
          </div>
        </div>
        <div class="inline" style="margin-top: 14px;">
          <button class="btn" type="submit">Salva dati</button>
        </div>
      </form>
      <div class="subsection-divider"></div>
      <div class="row-head compact">
        <h3>Configurazione sport</h3>
      </div>
      <div class="sports-config-grid">
        ${SPORTS.map((sportName) => renderSportConfig(day.id, sportName)).join("")}
      </div>
    </div>
    <div class="panel years-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Classi</p>
          <h2>Anni e sezioni</h2>
          <p class="fineprint">Un anno si può eliminare solo se non contiene sezioni. Una sezione si può eliminare solo se non contiene studenti.</p>
        </div>
        <form class="inline add-year-form" data-action="add-year" data-day-id="${day.id}">
          <div class="field">
            <label>Nuovo anno</label>
            <input name="label" placeholder="1, 2, 3..." required>
          </div>
          <button class="btn" type="submit">Aggiungi</button>
        </form>
      </div>
      <div class="years-list">
        ${getYears(day.id).map((year) => renderYearConfig(year)).join("") || `<div class="empty">Aggiungi anni e sezioni per avviare le prove.</div>`}
      </div>
    </div>
  `;
}

function renderSportConfig(dayId, sportName) {
  const sport = db.sports.find((item) => item.dayId === dayId && item.name === sportName);
  return `
    <div class="config-row">
      <div class="inline" style="justify-content: space-between; align-items: center;">
        <label class="check-item" style="min-width: 190px;">
          <input type="checkbox" data-action="toggle-sport" data-day-id="${dayId}" data-sport-name="${sportName}" ${sport ? "checked" : ""}>
          ${displaySportName(sportName)}
        </label>
        ${sport ? `
          <div class="inline">
            <div class="field">
              <label>Prove</label>
              <input type="number" min="1" max="8" value="${sport.attempts}" data-action="update-sport-attempts" data-sport-id="${sport.id}">
            </div>
            ${sportName === "Velocita" ? `
              <div class="field">
                <label>Finalisti</label>
                <input type="number" min="1" max="16" value="${sport.finalists}" data-action="update-sport-finalists" data-sport-id="${sport.id}">
              </div>
            ` : ""}
          </div>
        ` : `<span class="muted">Non presente</span>`}
      </div>
    </div>
  `;
}

function renderYearConfig(year) {
  const sections = getSections(year.id);
  const canDeleteYear = sections.length === 0;
  const sports = db.sports.filter((sport) => sport.dayId === year.dayId);
  return `
    <div class="year-card">
      <div class="year-table-head">
        <div class="year-title-edit">
          <span class="mini-label">Anno</span>
          <input value="${escapeHtml(year.label)}" data-action="update-year" data-year-id="${year.id}">
          <span class="pill">${sections.length} sezioni</span>
        </div>
        <button class="btn danger tiny" data-action="delete-year" data-year-id="${year.id}" ${canDeleteYear ? "" : "disabled"} title="${canDeleteYear ? "Elimina anno" : "Elimina prima tutte le sezioni"}">Elimina anno</button>
      </div>
      <div class="sections-table-wrap">
        <table class="sections-table">
          <thead>
            <tr>
              <th>Sezione</th>
              ${sports.map((sport) => `<th>${displaySportName(sport.name)}</th>`).join("")}
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${sections.map((section) => renderSectionRow(section, sports)).join("") || `
              <tr>
                <td colspan="${sports.length + 2}" class="muted">Nessuna sezione per questo anno.</td>
              </tr>
            `}
            <tr class="create-row">
              <td colspan="${sports.length + 2}">
                <form class="inline add-section-form" data-action="add-section" data-year-id="${year.id}">
                  <div class="field">
                    <label>Nuova sezione</label>
                    <input name="label" placeholder="A, B, C..." required>
                  </div>
                  <button class="btn tiny" type="submit">Aggiungi sezione</button>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSectionRow(section, sports) {
  const studentCount = countParticipants({ sectionId: section.id });
  const canDeleteSection = studentCount === 0;
  return `
    <tr>
      <td><input value="${escapeHtml(section.label)}" data-action="update-section" data-section-id="${section.id}"></td>
      ${sports.map((sport) => `<td><span class="pill">${countParticipants({ sectionId: section.id, sportId: sport.id })}</span></td>`).join("")}
      <td>
        <button class="btn danger tiny" data-action="delete-section" data-section-id="${section.id}" ${canDeleteSection ? "" : "disabled"} title="${canDeleteSection ? "Elimina sezione" : "Non puoi eliminare una sezione con studenti"}">Elimina</button>
      </td>
    </tr>
  `;
}

function renderSport() {
  const day = getDay(state.selectedDayId);
  const sport = getSport(state.selectedSportId);
  const activeTab = isGuest() ? "rankings" : state.sportTab;
  const sportTitle = sport.name === "Velocita"
    ? `Velocita ${state.speedPhase === "finals" ? "Finali" : "Qualifiche"}`
    : displaySportName(sport.name);
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">${escapeHtml(day.title)}</p>
          <h2>${escapeHtml(sportTitle)}</h2>
        </div>
        <button class="btn secondary" data-action="back-day">Sport della giornata</button>
      </div>
      <div class="tabs">
        ${!isGuest() ? `<button class="tab ${activeTab === "proves" ? "active" : ""}" data-action="sport-tab" data-tab="proves">Svolgimento Prove</button>` : ""}
        <button class="tab ${activeTab === "rankings" ? "active" : ""}" data-action="sport-tab" data-tab="rankings">Classifiche</button>
      </div>
      ${activeTab === "rankings" ? renderRankings(sport) : renderProves(sport)}
    </section>
  `;
}

function renderProves(sport) {
  if (isGuest()) return renderRankings(sport);
  if (!canEditResults()) return `<div class="empty">Non hai i permessi per modificare prove o partecipanti.</div>`;
  if (sport.name === "Staffetta") return renderRelayProves(sport);
  if (sport.name === "Velocita") return state.speedPhase === "finals" ? renderSpeedFinals(sport) : renderStandardProves(sport, "qualification");
  return renderStandardProves(sport, "standard");
}

function renderContextSelectors(includeSection = true) {
  const years = getYears(state.selectedDayId);
  ensureValidFilter(years, includeSection);
  const sections = includeSection ? getSections(state.filters.yearId) : [];
  return `
    <div class="inline" style="margin-bottom: 16px;">
      <div class="field">
        <label>Anno</label>
        <select data-action="filter-year">
          ${years.map((year) => `<option value="${year.id}" ${year.id === state.filters.yearId ? "selected" : ""}>${escapeHtml(year.label)}</option>`).join("")}
        </select>
      </div>
      ${includeSection ? `
        <div class="field">
          <label>Sezione</label>
          <select data-action="filter-section">
            ${sections.map((section) => `<option value="${section.id}" ${section.id === state.filters.sectionId ? "selected" : ""}>${escapeHtml(section.label)}</option>`).join("")}
          </select>
        </div>
      ` : ""}
      <div class="field">
        <label>Sesso</label>
        <select data-action="filter-sex">
          ${SEXES.map((sex) => `<option value="${sex.value}" ${sex.value === state.filters.sex ? "selected" : ""}>${sex.label}</option>`).join("")}
        </select>
      </div>
    </div>
  `;
}

function renderStandardProves(sport, phase) {
  const years = getYears(state.selectedDayId);
  if (!years.length) return `<div class="empty">Configura anni e sezioni prima di inserire risultati.</div>`;
  ensureValidFilter(years, true);
  if (!state.filters.sectionId) return `<div>${renderContextSelectors(true)}<div class="empty">Aggiungi almeno una sezione per l'anno selezionato.</div></div>`;

  const participants = getParticipantsForContext();
  const ordered = orderParticipants(participants);
  return `
    ${renderContextSelectors(true)}
    <div class="panel" style="margin-bottom: 16px;">
      <div class="row-head">
        <h3>Partecipanti</h3>
        <button class="btn secondary tiny" data-action="toggle-random">${state.randomOrder ? "Ordina per cognome" : "Ordine casuale"}</button>
      </div>
      <form class="inline" data-action="add-participant">
        <div class="field">
          <label>Nome</label>
          <input name="firstName" required>
        </div>
        <div class="field">
          <label>Cognome</label>
          <input name="lastName" required>
        </div>
        <button class="btn" type="submit">Aggiungi partecipante</button>
      </form>
    </div>
    ${ordered.length ? renderParticipantTable(ordered, sport, phase) : `<div class="empty">Nessun partecipante nel contesto selezionato.</div>`}
  `;
}

function renderParticipantTable(participants, sport, phase) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Cognome</th>
            <th>Nome</th>
            ${Array.from({ length: sport.attempts }, (_, index) => `<th>Prova ${index + 1}</th>`).join("")}
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${participants.map((participant) => `
            <tr>
              <td><input value="${escapeHtml(participant.lastName)}" data-action="update-participant" data-field="lastName" data-participant-id="${participant.id}"></td>
              <td><input value="${escapeHtml(participant.firstName)}" data-action="update-participant" data-field="firstName" data-participant-id="${participant.id}"></td>
              ${Array.from({ length: sport.attempts }, (_, index) => renderAttemptCell(sport, participant.id, phase, index + 1)).join("")}
              <td><button class="btn danger tiny" data-action="delete-participant" data-participant-id="${participant.id}">Elimina</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAttemptCell(sport, participantId, phase, attemptIndex) {
  const attempt = getAttempt(sport.id, participantId, phase, attemptIndex);
  const status = attempt?.status || "value";
  return `
    <td>
      <div class="attempt-cell">
        <select data-action="update-attempt-status" data-sport-id="${sport.id}" data-participant-id="${participantId}" data-phase="${phase}" data-attempt-index="${attemptIndex}">
          ${RESULT_STATES.map((item) => `<option value="${item.value}" ${item.value === status ? "selected" : ""}>${item.label}</option>`).join("")}
        </select>
        <input type="number" step="0.01" value="${escapeHtml(attempt?.value ?? "")}" ${status === "value" ? "" : "disabled"} data-action="update-attempt-value" data-sport-id="${sport.id}" data-participant-id="${participantId}" data-phase="${phase}" data-attempt-index="${attemptIndex}">
      </div>
    </td>
  `;
}

function renderRelayProves(sport) {
  const years = getYears(state.selectedDayId);
  if (!years.length) return `<div class="empty">Configura anni e sezioni prima di inserire squadre.</div>`;
  ensureValidFilter(years, true);
  if (!state.filters.sectionId) return `<div>${renderContextSelectors(true)}<div class="empty">Aggiungi almeno una sezione per l'anno selezionato.</div></div>`;
  const teams = orderRelayTeams(db.relayTeams
    .filter((team) => team.dayId === state.selectedDayId && team.sportId === sport.id && team.yearId === state.filters.yearId && team.sectionId === state.filters.sectionId && team.sex === state.filters.sex)
  );
  const pool = getParticipantsForContext();
  return `
    ${renderContextSelectors(true)}
    <section class="panel" id="relay-participants" style="margin-bottom: 16px;">
      <div class="row-head">
        <div>
          <h3>Partecipanti staffetta</h3>
          <p class="fineprint">Gli iscritti sono specifici per Staffetta, anno, sezione e sesso selezionati.</p>
        </div>
      </div>
      <form class="inline" data-action="add-participant">
        <div class="field">
          <label>Nome</label>
          <input name="firstName" required>
        </div>
        <div class="field">
          <label>Cognome</label>
          <input name="lastName" required>
        </div>
        <button class="btn" type="submit">Aggiungi partecipante</button>
      </form>
      ${pool.length ? renderRelayParticipantTable(pool) : `<div class="empty" style="margin-top: 14px;">Nessun partecipante iscritto alla staffetta in questo contesto.</div>`}
    </section>
    <section class="panel">
      <div class="row-head">
        <div>
          <h3>Squadre e risultati</h3>
          <p class="fineprint">I partecipanti delle squadre si modificano dal pulsante su ogni riga.</p>
        </div>
        <button class="btn secondary tiny" data-action="toggle-random">${state.randomOrder ? "Ordina squadre per nome" : "Ordine casuale squadre"}</button>
      </div>
      <form class="inline" data-action="add-team" data-sport-id="${sport.id}" style="margin-bottom: 14px;">
        <div class="field">
          <label>Nome o numero squadra</label>
          <input name="name" placeholder="Squadra 1" required>
        </div>
        <button class="btn" type="submit">Aggiungi squadra</button>
      </form>
      ${teams.length ? renderRelayTeamsTable(teams, pool) : `<div class="empty">Nessuna squadra creata.</div>`}
    </section>
    ${state.modalTeamId ? renderTeamModal(state.modalTeamId, pool) : ""}
  `;
}

function renderRelayParticipantTable(participants) {
  const ordered = [...participants].sort((a, b) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  );
  return `
    <div class="table-wrap" style="margin-top: 14px;">
      <table>
        <thead>
          <tr>
            <th>Cognome</th>
            <th>Nome</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${ordered.map((participant) => `
            <tr>
              <td><input value="${escapeHtml(participant.lastName)}" data-action="update-participant" data-field="lastName" data-participant-id="${participant.id}"></td>
              <td><input value="${escapeHtml(participant.firstName)}" data-action="update-participant" data-field="firstName" data-participant-id="${participant.id}"></td>
              <td><button class="btn danger tiny" data-action="delete-participant" data-participant-id="${participant.id}">Elimina</button></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRelayTeamsTable(teams, pool) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Squadra</th>
            <th>Partecipanti</th>
            <th>Risultato</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map((team) => renderTeamRow(team, pool)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderTeamRow(team, pool) {
  const result = getTeamResult(team.id);
  const status = result?.status || "value";
  const members = team.participantIds
    .map((participantId) => pool.find((participant) => participant.id === participantId))
    .filter(Boolean)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return `
    <tr>
      <td><input value="${escapeHtml(team.name)}" data-action="update-team-name" data-team-id="${team.id}"></td>
      <td>${members.map((participant) => `<span class="chip">${escapeHtml(participant.lastName)} ${escapeHtml(participant.firstName)}</span>`).join(" ") || `<span class="muted">Nessun partecipante assegnato</span>`}</td>
      <td>
        <div class="attempt-cell">
          <select data-action="update-team-status" data-team-id="${team.id}">
            ${RESULT_STATES.map((item) => `<option value="${item.value}" ${item.value === status ? "selected" : ""}>${item.label}</option>`).join("")}
          </select>
          <input type="number" step="0.01" placeholder="Tempo" value="${escapeHtml(result?.value ?? "")}" ${status === "value" ? "" : "disabled"} data-action="update-team-value" data-team-id="${team.id}">
        </div>
      </td>
      <td>
        <div class="card-actions">
          <button class="btn secondary tiny" data-action="open-team-modal" data-team-id="${team.id}">Modifica squadra</button>
          <button class="btn danger tiny" data-action="delete-team" data-team-id="${team.id}">Elimina</button>
        </div>
      </td>
    </tr>
  `;
}

function renderTeamModal(teamId, pool) {
  const team = db.relayTeams.find((item) => item.id === teamId);
  if (!team) return "";
  const teamsInContext = db.relayTeams.filter((item) =>
    item.id !== team.id &&
    item.dayId === team.dayId &&
    item.sportId === team.sportId &&
    item.yearId === team.yearId &&
    item.sectionId === team.sectionId &&
    item.sex === team.sex
  );
  const busyParticipantIds = new Set(teamsInContext.flatMap((item) => item.participantIds));
  const eligible = pool.filter((participant) => team.participantIds.includes(participant.id) || !busyParticipantIds.has(participant.id));
  return `
    <div class="modal-backdrop" data-action="close-team-modal">
      <section class="modal team-modal" role="dialog" aria-modal="true" aria-label="Modifica squadra" data-modal-panel>
        <div class="section-head">
          <div>
            <p class="eyebrow">Staffetta</p>
            <h2>${escapeHtml(team.name)}</h2>
            <p class="fineprint">Sono disponibili solo gli studenti non assegnati ad altre squadre dello stesso contesto.</p>
          </div>
          <button class="icon-btn" title="Chiudi" data-action="close-team-modal">×</button>
        </div>
        ${eligible.length ? `
          <div class="table-wrap">
            <table class="team-picker-table">
              <thead>
                <tr>
                  <th>In squadra</th>
                  <th>Cognome</th>
                  <th>Nome</th>
                </tr>
              </thead>
              <tbody>
                ${eligible
                  .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName))
                  .map((participant) => `
                    <tr>
                      <td>
                        <input type="checkbox" aria-label="Assegna ${escapeHtml(participant.lastName)} ${escapeHtml(participant.firstName)}" data-action="toggle-team-participant" data-team-id="${team.id}" data-participant-id="${participant.id}" ${team.participantIds.includes(participant.id) ? "checked" : ""}>
                      </td>
                      <td>${escapeHtml(participant.lastName)}</td>
                      <td>${escapeHtml(participant.firstName)}</td>
                    </tr>
                  `).join("")}
              </tbody>
            </table>
          </div>
        ` : `<div class="empty">Nessuno studente disponibile. Aggiungi prima partecipanti alla staffetta.</div>`}
      </section>
    </div>
  `;
}

function renderSpeedFinals(sport) {
  const years = getYears(state.selectedDayId);
  if (!years.length) return `<div class="empty">Configura gli anni prima di gestire le finali.</div>`;
  ensureValidFilter(years, false);
  const finalists = getEffectiveSpeedFinalists(sport, state.filters.yearId, state.filters.sex);
  return `
    ${renderContextSelectors(false)}
    ${finalists.length ? `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Atleta</th>
              <th>Sezione</th>
              <th>Tempo qualifica</th>
              <th>Tempo finale</th>
            </tr>
          </thead>
          <tbody>
            ${finalists.map((item) => {
              const result = getFinalResult(sport.id, item.participant.id);
              const status = result?.status || "value";
              return `
                <tr>
                  <td>${escapeHtml(item.participant.lastName)} ${escapeHtml(item.participant.firstName)}</td>
                  <td>${escapeHtml(getSection(item.participant.sectionId)?.label || "")}</td>
                  <td>${formatMeasure(item.best, "time")}</td>
                  <td>
                    <div class="attempt-cell">
                      <select data-action="update-final-status" data-sport-id="${sport.id}" data-participant-id="${item.participant.id}">
                        ${RESULT_STATES.map((stateItem) => `<option value="${stateItem.value}" ${stateItem.value === status ? "selected" : ""}>${stateItem.label}</option>`).join("")}
                      </select>
                      <input type="number" step="0.01" value="${escapeHtml(result?.value ?? "")}" ${status === "value" ? "" : "disabled"} data-action="update-final-value" data-sport-id="${sport.id}" data-participant-id="${item.participant.id}">
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    ` : `<div class="empty">Nessun tempo di qualifica valido per generare la finale.</div>`}
  `;
}

function renderRankings(sport) {
  const years = getYears(state.selectedDayId);
  if (!years.length) return `<div class="empty">Nessun anno configurato.</div>`;
  ensureValidFilter(years, false);
  const rankingPhase = sport.name === "Velocita" ? state.speedPhase : null;
  const rows = computeRanking(sport, state.filters.yearId, state.filters.sex, rankingPhase);
  persistRanking(sport, state.filters.yearId, state.filters.sex, rows, rankingPhase);
  return `
    ${renderContextSelectors(false)}
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Posizione</th>
            <th>${sport.name === "Staffetta" ? "Squadra" : "Partecipante"}</th>
            <th>Sezione</th>
            <th>Risultato</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
              <tr>
                <td>${row.position ? `<span class="rank">${row.position}</span>` : `<span class="muted">-</span>`}</td>
                <td>${renderRankingNameCell(row, sport)}</td>
                <td>${escapeHtml(row.section || "")}</td>
                <td>${row.resultText}</td>
                <td>${escapeHtml(row.statusText)}</td>
            </tr>
          `).join("") || `<tr><td colspan="5" class="muted">Nessun risultato disponibile.</td></tr>`}
        </tbody>
      </table>
    </div>
    ${state.teamInfoId ? renderTeamInfoModal(state.teamInfoId) : ""}
  `;
}

function renderRankingNameCell(row, sport) {
  if (sport.name !== "Staffetta") return escapeHtml(row.name);
  return `<button class="text-link" data-action="open-team-info" data-team-id="${row.id}">${escapeHtml(row.name)}</button>`;
}

function renderTeamInfoModal(teamId) {
  const team = db.relayTeams.find((item) => item.id === teamId);
  if (!team) return "";
  const members = team.participantIds
    .map((participantId) => db.participants.find((participant) => participant.id === participantId))
    .filter(Boolean)
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  return `
    <div class="modal-backdrop" data-action="close-team-info">
      <section class="modal team-modal" role="dialog" aria-modal="true" aria-label="Partecipanti squadra" data-modal-panel>
        <div class="section-head">
          <div>
            <p class="eyebrow">Staffetta</p>
            <h2>${escapeHtml(team.name)}</h2>
          </div>
          <button class="icon-btn" title="Chiudi" data-action="close-team-info">×</button>
        </div>
        <div class="table-wrap">
          <table class="team-picker-table">
            <thead>
              <tr>
                <th>Cognome</th>
                <th>Nome</th>
              </tr>
            </thead>
            <tbody>
              ${members.length ? members.map((participant) => `
                <tr>
                  <td>${escapeHtml(participant.lastName)}</td>
                  <td>${escapeHtml(participant.firstName)}</td>
                </tr>
              `).join("") : `<tr><td colspan="2" class="muted">Nessun partecipante assegnato.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}



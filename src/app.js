import { RESULT_STATES, ROLES, SEXES, SPORTS } from "./constants.js";
import { formatDate, today } from "./utils/dates.js";
import { escapeHtml } from "./utils/html.js";
import { id } from "./utils/ids.js";
import { formatMeasure, normalizePositiveInteger } from "./utils/numbers.js";
import { compareSportsDaysByDateDesc, naturalCompare } from "./utils/sorting.js";
import { getDb, getSession, saveDb as persistDb, saveSession, clearSession } from "./data/repository.js";
import { LOCKED_ADMIN_ID } from "./data/schema.js";

const state = {
  view: "auth",
  user: null,
  selectedDayId: null,
  selectedSportId: null,
  dashboardSection: "days",
  sportTab: "proves",
  speedPhase: "qualifications",
  modalTeamId: null,
  teamInfoId: null,
  profileOpen: false,
  randomOrder: false,
  filters: {
    yearId: "",
    sectionId: "",
    sex: "M"
  }
};

let db = getDb();

const app = document.querySelector("#app");

function normalizeSportName(name) {
  return name === "Velocità" ? "Velocita" : name;
}

function displaySportName(name) {
  return name === "Velocita" ? "Velocità" : name;
}

function isLockedUser(userOrId) {
  const user = typeof userOrId === "string" ? db.users.find((item) => item.id === userOrId) : userOrId;
  return user?.id === LOCKED_ADMIN_ID || user?.locked === true;
}

function saveDb() {
  persistDb(db);
}

function setSession(user) {
  state.user = user ? { id: user.id, username: user.username, role: user.role } : null;
  if (state.user) saveSession(state.user);
  else clearSession();
}

function restoreSession() {
  const session = getSession();
  if (!session) return;
  if (session.role === ROLES.GUEST || db.users.some((user) => user.id === session.id)) {
    state.user = session;
    state.view = "dashboard";
  }
}

function canAdmin() {
  return state.user?.role === ROLES.ADMIN;
}

function canEditResults() {
  return state.user?.role === ROLES.ADMIN || state.user?.role === ROLES.TEACHER;
}

function isGuest() {
  return state.user?.role === ROLES.GUEST;
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

function render() {
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

function getDaySportWidgets(sports) {
  return sports.flatMap((sport) => {
    if (sport.name !== "Velocita") return [{ sport, label: displaySportName(sport.name), phase: null }];
    return [
      { sport, label: "Velocita Qualifiche", phase: "qualifications" },
      { sport, label: "Velocita Finali", phase: "finals" }
    ];
  });
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

function getDay(dayId) {
  return db.sportsDays.find((day) => day.id === dayId);
}

function getSport(sportId) {
  return db.sports.find((sport) => sport.id === sportId);
}

function getYears(dayId) {
  return db.years
    .filter((year) => year.dayId === dayId)
    .sort((a, b) => naturalCompare(a.label, b.label));
}

function getSections(yearId) {
  return db.sections
    .filter((section) => section.yearId === yearId)
    .sort((a, b) => naturalCompare(a.label, b.label));
}

function getSection(sectionId) {
  return db.sections.find((section) => section.id === sectionId);
}

function countParticipants({ dayId = state.selectedDayId, sportId, yearId, sectionId, sex } = {}) {
  return db.participants.filter((participant) =>
    (!dayId || participant.dayId === dayId) &&
    (!sportId || participant.sportId === sportId) &&
    (!yearId || participant.yearId === yearId) &&
    (!sectionId || participant.sectionId === sectionId) &&
    (!sex || participant.sex === sex)
  ).length;
}

function getSportParticipants(sport) {
  return db.participants.filter((participant) =>
    participant.dayId === sport.dayId &&
    participant.sportId === sport.id
  );
}

function isAttemptComplete(attempt) {
  if (!attempt) return false;
  if (attempt.status === "retired" || attempt.status === "disqualified") return true;
  return attempt.status === "value" && attempt.value !== "";
}

function isResultComplete(result) {
  if (!result) return false;
  if (result.status === "retired" || result.status === "disqualified") return true;
  return result.status === "value" && result.value !== "";
}

function getCompletionPhase(sport) {
  return sport.name === "Velocita" ? "qualification" : "standard";
}

function isParticipantSportComplete(participant, sport, phase = getCompletionPhase(sport)) {
  return Array.from({ length: sport.attempts }, (_, index) =>
    isAttemptComplete(getAttempt(sport.id, participant.id, phase, index + 1))
  ).every(Boolean);
}

function getRelayTeamsForSport(sport) {
  return db.relayTeams.filter((team) => team.dayId === sport.dayId && team.sportId === sport.id);
}

function getSpeedFinalistParticipants(sport) {
  return getYears(sport.dayId).flatMap((year) =>
    SEXES.flatMap((sex) => getEffectiveSpeedFinalists(sport, year.id, sex.value).map((item) => item.participant))
  );
}

function isSpeedFinalComplete(participant, sport) {
  return isResultComplete(getFinalResult(sport.id, participant.id));
}

function getSportProgress(sport, phase = null) {
  if (sport.name === "Staffetta") {
    const teams = getRelayTeamsForSport(sport);
    return {
      total: teams.length,
      completed: teams.filter((team) => isResultComplete(getTeamResult(team.id))).length
    };
  }

  if (sport.name === "Velocita" && phase === "finals") {
    const finalists = getSpeedFinalistParticipants(sport);
    return {
      total: finalists.length,
      completed: finalists.filter((participant) => isSpeedFinalComplete(participant, sport)).length
    };
  }

  const participants = getSportParticipants(sport);
  return {
    total: participants.length,
    completed: participants.filter((participant) => isParticipantSportComplete(participant, sport, sport.name === "Velocita" ? "qualification" : "standard")).length
  };
}

function getMissingProofRows(dayId, sportWidgets) {
  return sportWidgets
    .flatMap((widget) => getIncompleteSectionRows(dayId, widget))
    .filter((row) => row.incomplete > 0)
    .sort((a, b) =>
      a.sport.localeCompare(b.sport) ||
      naturalCompare(a.year, b.year) ||
      naturalCompare(a.section, b.section) ||
      a.sex.localeCompare(b.sex)
    );
}

function computeSectionStandings(day, sportWidgets) {
  const maxScore = normalizePositiveInteger(day.maxSectionScore, 8);
  return getYears(day.id).map((year) => {
    const totals = new Map(getSections(year.id).map((section) => [section.id, {
      section: section.label,
      points: 0
    }]));

    sportWidgets.forEach((widget) => {
      SEXES.forEach((sex) => {
        const rows = computeRanking(widget.sport, year.id, sex.value, widget.phase);
        rows.forEach((row) => {
          if (!row.position) return;
          const sectionId = getRankingRowSectionId(row, widget.sport);
          if (!sectionId || !totals.has(sectionId)) return;
          const points = Math.max(maxScore - row.position + 1, 0);
          totals.get(sectionId).points += points;
        });
      });
    });

    const rows = [...totals.values()].sort((a, b) => b.points - a.points || naturalCompare(a.section, b.section));
    return { year, rows };
  });
}

function getRankingRowSectionId(row, sport) {
  if (sport.name === "Staffetta") {
    return db.relayTeams.find((team) => team.id === row.id)?.sectionId || "";
  }
  return db.participants.find((participant) => participant.id === row.id)?.sectionId || "";
}

function getIncompleteSectionRows(dayId, widget) {
  const { sport, phase, label } = widget;
  if (sport.name === "Velocita" && phase === "finals") {
    return getYears(dayId).flatMap((year) => SEXES.map((sex) => {
      const finalists = getEffectiveSpeedFinalists(sport, year.id, sex.value).map((item) => item.participant);
      return {
        sport: label,
        year: year.label,
        section: "",
        sex: sex.label,
        incomplete: finalists.filter((participant) => !isSpeedFinalComplete(participant, sport)).length
      };
    }));
  }

  return getYears(dayId).flatMap((year) =>
    getSections(year.id).flatMap((section) => SEXES.map((sex) => {
      if (sport.name === "Staffetta") {
        const teams = db.relayTeams.filter((team) =>
          team.dayId === dayId &&
          team.sportId === sport.id &&
          team.yearId === year.id &&
          team.sectionId === section.id &&
          team.sex === sex.value
        );
        return {
          sport: label,
          year: year.label,
          section: section.label,
          sex: sex.label,
          incomplete: teams.filter((team) => !isResultComplete(getTeamResult(team.id))).length
        };
      }

      const participants = db.participants.filter((participant) =>
          participant.dayId === dayId &&
          participant.sportId === sport.id &&
          participant.yearId === year.id &&
          participant.sectionId === section.id &&
          participant.sex === sex.value
        );
      const completionPhase = sport.name === "Velocita" ? "qualification" : "standard";
      return {
        sport: label,
        year: year.label,
        section: section.label,
        sex: sex.label,
        incomplete: participants.filter((participant) => !isParticipantSportComplete(participant, sport, completionPhase)).length
      };
    }))
  );
}

function getParticipantsForContext() {
  return db.participants.filter((participant) =>
    participant.dayId === state.selectedDayId &&
    participant.sportId === state.selectedSportId &&
    participant.yearId === state.filters.yearId &&
    participant.sectionId === state.filters.sectionId &&
    participant.sex === state.filters.sex
  );
}

function orderParticipants(participants) {
  const sorted = [...participants].sort((a, b) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)
  );
  if (!state.randomOrder) return sorted;
  return sorted.map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
}

function orderRelayTeams(teams) {
  const sorted = [...teams].sort((a, b) => naturalCompare(a.name, b.name));
  if (!state.randomOrder) return sorted;
  return sorted.map((item) => ({ item, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ item }) => item);
}

function ensureValidFilter(years, includeSection) {
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

function statusLabel(status) {
  if (status === "retired") return "Ritirato";
  if (status === "disqualified") return "Squalificato";
  return "Valido";
}

function getAttempt(sportId, participantId, phase, attemptIndex) {
  return db.attempts.find((attempt) =>
    attempt.sportId === sportId &&
    attempt.participantId === participantId &&
    attempt.phase === phase &&
    attempt.attemptIndex === attemptIndex
  );
}

function upsertAttempt({ sportId, participantId, phase, attemptIndex, status, value }) {
  let attempt = getAttempt(sportId, participantId, phase, attemptIndex);
  if (!attempt) {
    attempt = { id: id("attempt"), dayId: state.selectedDayId, sportId, participantId, phase, attemptIndex, status: "value", value: "" };
    db.attempts.push(attempt);
  }
  if (status !== undefined) {
    attempt.status = status;
    if (status !== "value") attempt.value = "";
  }
  if (value !== undefined) attempt.value = value;
  saveDb();
}

function getTeamResult(teamId) {
  return db.results.find((result) => result.targetType === "team" && result.targetId === teamId);
}

function upsertTeamResult(teamId, patch) {
  const team = db.relayTeams.find((item) => item.id === teamId);
  let result = getTeamResult(teamId);
  if (!result) {
    result = {
      id: id("result"),
      dayId: team.dayId,
      sportId: team.sportId,
      phase: "relay",
      targetType: "team",
      targetId: teamId,
      status: "value",
      value: ""
    };
    db.results.push(result);
  }
  Object.assign(result, patch);
  if (result.status !== "value") result.value = "";
  saveDb();
}

function getFinalResult(sportId, participantId) {
  return db.results.find((result) =>
    result.sportId === sportId &&
    result.phase === "final" &&
    result.targetType === "participant" &&
    result.targetId === participantId
  );
}

function upsertFinalResult(sportId, participantId, patch) {
  let result = getFinalResult(sportId, participantId);
  if (!result) {
    result = {
      id: id("result"),
      dayId: state.selectedDayId,
      sportId,
      phase: "final",
      targetType: "participant",
      targetId: participantId,
      status: "value",
      value: ""
    };
    db.results.push(result);
  }
  Object.assign(result, patch);
  if (result.status !== "value") result.value = "";
  saveDb();
}

function bestParticipantResult(sport, participant, phase) {
  const attempts = db.attempts.filter((attempt) =>
    attempt.sportId === sport.id &&
    attempt.participantId === participant.id &&
    attempt.phase === phase
  );
  const numeric = attempts
    .filter((attempt) => attempt.status === "value" && attempt.value !== "")
    .map((attempt) => Number(attempt.value))
    .filter((value) => Number.isFinite(value));
  const invalid = attempts.find((attempt) => attempt.status === "retired" || attempt.status === "disqualified");
  if (numeric.length) {
    const best = sport.name === "Velocita" ? Math.min(...numeric) : Math.max(...numeric);
    return { value: best, status: "value" };
  }
  if (invalid) return { value: null, status: invalid.status };
  return { value: null, status: "missing" };
}

function getSpeedFinalists(sport, yearId, sex) {
  return getSpeedQualifiedCandidates(sport, yearId, sex).slice(0, sport.finalists);
}

function getSpeedQualifiedCandidates(sport, yearId, sex) {
  return db.participants
    .filter((participant) => participant.dayId === sport.dayId && participant.sportId === sport.id && participant.yearId === yearId && participant.sex === sex)
    .map((participant) => ({ participant, best: bestParticipantResult(sport, participant, "qualification").value }))
    .filter((item) => Number.isFinite(item.best))
    .sort((a, b) => a.best - b.best || a.participant.lastName.localeCompare(b.participant.lastName));
}

function isFinalWithdrawnOrDisqualified(sport, participantId) {
  const result = getFinalResult(sport.id, participantId);
  return result?.status === "retired";
}

function getEffectiveSpeedFinalists(sport, yearId, sex) {
  const selected = [];
  let activeCount = 0;

  for (const item of getSpeedQualifiedCandidates(sport, yearId, sex)) {
    selected.push(item);
    if (!isFinalWithdrawnOrDisqualified(sport, item.participant.id)) activeCount += 1;
    if (activeCount >= sport.finalists) break;
  }

  return selected;
}

function computeRanking(sport, yearId, sex, phase = null) {
  if (sport.name === "Staffetta") return computeRelayRanking(sport, yearId, sex);
  if (sport.name === "Velocita" && phase === "qualifications") return computeSpeedQualificationRanking(sport, yearId, sex);
  if (sport.name === "Velocita") return computeSpeedRanking(sport, yearId, sex);
  return computeStandardRanking(sport, yearId, sex);
}

function computeSpeedQualificationRanking(sport, yearId, sex) {
  const rows = db.participants
    .filter((participant) => participant.dayId === sport.dayId && participant.sportId === sport.id && participant.yearId === yearId && participant.sex === sex)
    .map((participant) => {
      const best = bestParticipantResult(sport, participant, "qualification");
      return {
        id: participant.id,
        name: `${participant.lastName} ${participant.firstName}`,
        section: getSection(participant.sectionId)?.label || "",
        raw: best.value,
        status: best.status
      };
    });
  return rankRows(rows, "asc", "time");
}

function computeStandardRanking(sport, yearId, sex) {
  const rows = db.participants
    .filter((participant) => participant.dayId === state.selectedDayId && participant.sportId === sport.id && participant.yearId === yearId && participant.sex === sex)
    .map((participant) => {
      const best = bestParticipantResult(sport, participant, "standard");
      return {
        id: participant.id,
        name: `${participant.lastName} ${participant.firstName}`,
        section: getSection(participant.sectionId)?.label || "",
        raw: best.value,
        status: best.status
      };
    });
  return rankRows(rows, sport.name === "Velocita" ? "asc" : "desc", sport.name === "Velocita" ? "time" : "distance");
}

function computeRelayRanking(sport, yearId, sex) {
  const rows = db.relayTeams
    .filter((team) => team.dayId === state.selectedDayId && team.sportId === sport.id && team.yearId === yearId && team.sex === sex)
    .map((team) => {
      const result = getTeamResult(team.id);
      return {
        id: team.id,
        name: team.name,
        section: getSection(team.sectionId)?.label || "",
        raw: result?.status === "value" && result.value !== "" ? Number(result.value) : null,
        status: result?.status || "missing"
      };
    });
  return rankRows(rows, "asc", "time");
}

function computeSpeedRanking(sport, yearId, sex) {
  const all = db.participants.filter((participant) => participant.dayId === sport.dayId && participant.sportId === sport.id && participant.yearId === yearId && participant.sex === sex);
  const finalistIds = getEffectiveSpeedFinalists(sport, yearId, sex).map((item) => item.participant.id);
  const finalistRows = finalistIds.map((participantId) => {
    const participant = all.find((item) => item.id === participantId);
    const final = getFinalResult(sport.id, participantId);
    const qualification = bestParticipantResult(sport, participant, "qualification");
    return {
      id: participant.id,
      name: `${participant.lastName} ${participant.firstName}`,
      section: getSection(participant.sectionId)?.label || "",
      raw: final?.status === "value" && final.value !== "" ? Number(final.value) : null,
      status: final?.status || "missing",
      finalist: true,
      qualificationRaw: qualification.value
    };
  });
  const nonFinalistRows = all
    .filter((participant) => !finalistIds.includes(participant.id))
    .map((participant) => {
      const qualification = bestParticipantResult(sport, participant, "qualification");
      return {
        id: participant.id,
        name: `${participant.lastName} ${participant.firstName}`,
        section: getSection(participant.sectionId)?.label || "",
        raw: qualification.value,
        status: qualification.status,
        finalist: false
      };
    });

  const validFinalists = finalistRows.filter((row) => Number.isFinite(row.raw)).sort((a, b) => a.raw - b.raw);
  const activeFinalistsWithoutTime = finalistRows
    .filter((row) => !Number.isFinite(row.raw) && row.status !== "retired" && row.status !== "disqualified")
    .sort((a, b) => a.qualificationRaw - b.qualificationRaw);
  const withdrawnFinalists = finalistRows.filter((row) => row.status === "retired" || row.status === "disqualified");
  const validNonFinalists = nonFinalistRows.filter((row) => Number.isFinite(row.raw)).sort((a, b) => a.raw - b.raw);
  const invalidNonFinalists = nonFinalistRows.filter((row) => !Number.isFinite(row.raw));

  const activeFinalists = [...validFinalists, ...activeFinalistsWithoutTime].slice(0, sport.finalists);
  const positionedFinalists = activeFinalists.map((row, index) => presentRankRow(row, index + 1, "time"));
  const positionedNonFinalists = validNonFinalists.map((row, index) => presentRankRow(row, positionedFinalists.length + index + 1, "time"));
  const invalid = [...withdrawnFinalists, ...invalidNonFinalists].map((row) => presentRankRow(row, null, "time"));
  return [...positionedFinalists, ...positionedNonFinalists, ...invalid];
}

function rankRows(rows, direction, kind) {
  const valid = rows
    .filter((row) => Number.isFinite(row.raw) && row.status === "value")
    .sort((a, b) => direction === "asc" ? a.raw - b.raw : b.raw - a.raw);
  const invalid = rows.filter((row) => !(Number.isFinite(row.raw) && row.status === "value"));
  return [
    ...valid.map((row, index) => presentRankRow(row, index + 1, kind)),
    ...invalid.map((row) => presentRankRow(row, null, kind))
  ];
}

function presentRankRow(row, position, kind) {
  return {
    id: row.id,
    position,
    name: row.name,
    section: row.section,
    resultText: Number.isFinite(row.raw) ? formatMeasure(row.raw, kind === "time" ? "time" : "distance") : "-",
    statusText: row.status === "missing" ? "Nessun risultato" : statusLabel(row.status)
  };
}

function persistRanking(sport, yearId, sex, rows, phase = null) {
  db.rankings = db.rankings.filter((ranking) => !(
    ranking.dayId === state.selectedDayId &&
    ranking.sportId === sport.id &&
    ranking.yearId === yearId &&
    ranking.sex === sex &&
    (ranking.phase || null) === phase
  ));
  db.rankings.push({
    id: id("ranking"),
    dayId: state.selectedDayId,
    sportId: sport.id,
    phase,
    yearId,
    sex,
    rows,
    updatedAt: new Date().toISOString()
  });
  saveDb();
}

function addDefaultSports(dayId, selectedSports) {
  selectedSports.forEach((sportName) => {
    db.sports.push({
      id: id("sport"),
      dayId,
      name: normalizeSportName(sportName),
      attempts: normalizeSportName(sportName) === "Staffetta" ? 1 : 3,
      finalists: 6
    });
  });
}

function createSport(dayId, sportName) {
  db.sports.push({
    id: id("sport"),
    dayId,
    name: sportName,
    attempts: sportName === "Staffetta" ? 1 : 3,
    finalists: 6
  });
}

function deleteSport(sportId) {
  const participantIds = db.participants.filter((participant) => participant.sportId === sportId).map((participant) => participant.id);
  db.sports = db.sports.filter((sport) => sport.id !== sportId);
  db.participants = db.participants.filter((participant) => participant.sportId !== sportId);
  db.attempts = db.attempts.filter((attempt) => attempt.sportId !== sportId);
  db.results = db.results.filter((result) => result.sportId !== sportId && !participantIds.includes(result.targetId));
  db.relayTeams = db.relayTeams.filter((team) => team.sportId !== sportId);
  db.rankings = db.rankings.filter((ranking) => ranking.sportId !== sportId);
}

function cleanupDay(dayId) {
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

function serializeForm(form) {
  return Object.fromEntries(new FormData(form).entries());
}

app.addEventListener("submit", (event) => {
  const form = event.target.closest("form");
  if (!form) return;
  event.preventDefault();
  const action = form.dataset.action;
  const data = serializeForm(form);

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
    state.user.username = next;
    saveSession(state.user);
  }
  saveDb();
  toast("Utente aggiornato.");
  render();
}

function resetFilters() {
  state.filters = { yearId: "", sectionId: "", sex: "M" };
  state.randomOrder = false;
}

function renderTopbar() {
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

restoreSession();
render();

import { SPORTS } from "../constants.js";
import { db, state } from "../state.js";
import { canAdmin } from "../auth/permissions.js";
import { formatDate } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";
import { normalizePositiveInteger } from "../utils/numbers.js";
import { getDay, getSections, getYears } from "../domain/days.js";
import { displaySportName, getDaySportWidgets } from "../domain/sports.js";
import { countParticipants } from "../domain/participants.js";
import { computeSectionStandings } from "../domain/rankings.js";
import { getMissingProofRows, getSportProgress } from "../domain/progress.js";
export function renderDay() {
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

export function renderDayEdit() {
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



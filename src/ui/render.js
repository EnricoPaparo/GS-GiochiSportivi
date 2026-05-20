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
import { renderAuth } from "./renderAuth.js";
import { renderDashboard } from "./renderDashboard.js";
import { renderDay, renderDayEdit } from "./renderDay.js";
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






import { SPORTS } from "../constants.js";
import { db } from "../state.js";
import { canAdmin } from "../auth/permissions.js";
import { formatDate, today } from "../utils/dates.js";
import { escapeHtml } from "../utils/html.js";
import { compareSportsDaysByDateDesc } from "../utils/sorting.js";
import { displaySportName } from "../domain/sports.js";
import { getDayProgress } from "../domain/progress.js";

export function renderDaysSection() {
  const days = [...db.sportsDays].sort(compareSportsDaysByDateDesc);
  const guestsEnabled = db.meta?.guestsEnabled !== false;
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Dashboard Giornate</p>
          <h2>Giornate sportive</h2>
        </div>
        ${canAdmin() ? `
          <div class="inline">
            <button class="btn ${guestsEnabled ? "danger" : "secondary"}" data-action="toggle-guest-access">
              ${guestsEnabled ? "Blocca ospiti" : "Permetti ospiti"}
            </button>
            <button class="btn" data-action="toggle-create-day">Nuova giornata</button>
          </div>
        ` : ""}
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
  const progress = getDayProgress(day.id);
  const percent = progress.total ? Math.round((progress.completed / progress.total) * 100) : 0;
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
      <div class="progress-block" aria-label="Avanzamento giornata ${progress.completed} su ${progress.total}">
        <div class="progress-meta">
          <span>Completamento</span>
          <strong>${percent}%</strong>
        </div>
        <div class="progress-track">
          <span class="progress-fill" style="width: ${percent}%"></span>
        </div>
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

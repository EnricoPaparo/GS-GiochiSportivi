import { SEXES } from "../constants.js";
import { state } from "../state.js";
import { getDay, getYears } from "../domain/days.js";
import { computeRanking } from "../domain/rankings.js";
import { displaySportName, getSport } from "../domain/sports.js";
import { escapeHtml } from "../utils/html.js";

function selectedYearLabel(dayId) {
  return getYears(dayId).find((year) => year.id === state.filters.yearId)?.label || "";
}

function selectedSexLabel() {
  return SEXES.find((sex) => sex.value === state.filters.sex)?.label || "";
}

function sportPrintTitle(sport) {
  if (sport.name !== "Velocita") return displaySportName(sport.name);
  return `Velocita ${state.speedPhase === "finals" ? "Finali" : "Qualifiche"}`;
}

function buildPrintableRankingHtml(day, sport, rows) {
  const title = sportPrintTitle(sport);
  return `
    <!doctype html>
    <html lang="it">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(day.title)} - ${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 28px;
            color: #142033;
            font-family: "Segoe UI", Arial, sans-serif;
          }
          h1 { margin: 0 0 6px; font-size: 24px; }
          h2 { margin: 0 0 22px; font-size: 17px; color: #475569; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th, td { padding: 9px 10px; border: 1px solid #d6e2ee; text-align: left; }
          th { background: #176b87; color: #fff; text-transform: uppercase; font-size: 11px; }
          .meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; color: #475569; }
          .pill { padding: 5px 9px; border: 1px solid #d6e2ee; border-radius: 6px; }
          @page { margin: 16mm; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(day.title)}</h1>
        <h2>Classifica ${escapeHtml(title)}</h2>
        <div class="meta">
          <span class="pill">Anno: ${escapeHtml(selectedYearLabel(day.id))}</span>
          <span class="pill">Sesso: ${escapeHtml(selectedSexLabel())}</span>
        </div>
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
            ${rows.length ? rows.map((row) => `
              <tr>
                <td>${row.position || "-"}</td>
                <td>${escapeHtml(row.name)}</td>
                <td>${escapeHtml(row.section || "")}</td>
                <td>${escapeHtml(row.resultText)}</td>
                <td>${escapeHtml(row.statusText)}</td>
              </tr>
            `).join("") : `
              <tr>
                <td colspan="5">Nessun risultato disponibile.</td>
              </tr>
            `}
          </tbody>
        </table>
      </body>
    </html>
  `;
}

export function printCurrentRanking() {
  const day = getDay(state.selectedDayId);
  const sport = getSport(state.selectedSportId);
  if (!day || !sport || !state.filters.yearId) return false;

  const rankingPhase = sport.name === "Velocita" ? state.speedPhase : null;
  const rows = computeRanking(sport, state.filters.yearId, state.filters.sex, rankingPhase);
  const printWindow = window.open("", "gs-ranking-print");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildPrintableRankingHtml(day, sport, rows));
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 120);
  return true;
}

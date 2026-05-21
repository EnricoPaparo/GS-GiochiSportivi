import { SEXES } from "../constants.js";
import { db, state } from "../state.js";
import { formatMeasure, normalizePositiveInteger } from "../utils/numbers.js";
import { naturalCompare } from "../utils/sorting.js";
import { getSection, getSections, getYears } from "./days.js";
import { bestParticipantResult, getFinalResult, getTeamResult } from "./results.js";

export function statusLabel(status) {
  if (status === "null") return "Nullo";
  if (status === "retired") return "Ritirato";
  if (status === "disqualified") return "Squalificato";
  return "Valido";
}

export function getSpeedFinalists(sport, yearId, sex) {
  return getSpeedQualifiedCandidates(sport, yearId, sex).slice(0, sport.finalists);
}

export function getSpeedQualifiedCandidates(sport, yearId, sex) {
  return db.participants
    .filter((participant) => participant.dayId === sport.dayId && participant.sportId === sport.id && participant.yearId === yearId && participant.sex === sex)
    .map((participant) => ({ participant, best: bestParticipantResult(sport, participant, "qualification").value }))
    .filter((item) => Number.isFinite(item.best))
    .sort((a, b) => a.best - b.best || a.participant.lastName.localeCompare(b.participant.lastName));
}

export function isFinalWithdrawnOrDisqualified(sport, participantId) {
  const result = getFinalResult(sport.id, participantId);
  return result?.status === "retired";
}

export function getEffectiveSpeedFinalists(sport, yearId, sex) {
  const selected = [];
  let activeCount = 0;

  for (const item of getSpeedQualifiedCandidates(sport, yearId, sex)) {
    selected.push(item);
    if (!isFinalWithdrawnOrDisqualified(sport, item.participant.id)) activeCount += 1;
    if (activeCount >= sport.finalists) break;
  }

  return selected;
}

export function computeRanking(sport, yearId, sex, phase = null) {
  if (sport.name === "Staffetta") return computeRelayRanking(sport, yearId, sex);
  if (sport.name === "Velocita" && phase === "qualifications") return computeSpeedQualificationRanking(sport, yearId, sex);
  if (sport.name === "Velocita") return computeSpeedRanking(sport, yearId, sex);
  return computeStandardRanking(sport, yearId, sex);
}

export function computeSpeedQualificationRanking(sport, yearId, sex) {
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

export function computeStandardRanking(sport, yearId, sex) {
  const isTimedSport = sport.name === "Resistenza";
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
  return rankRows(rows, isTimedSport ? "asc" : "desc", isTimedSport ? "time" : "distance");
}

export function computeRelayRanking(sport, yearId, sex) {
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

export function computeSpeedRanking(sport, yearId, sex) {
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

export function rankRows(rows, direction, kind) {
  const valid = rows
    .filter((row) => Number.isFinite(row.raw) && row.status === "value")
    .sort((a, b) => direction === "asc" ? a.raw - b.raw : b.raw - a.raw);
  const invalid = rows.filter((row) => !(Number.isFinite(row.raw) && row.status === "value"));
  return [
    ...valid.map((row, index) => presentRankRow(row, index + 1, kind)),
    ...invalid.map((row) => presentRankRow(row, null, kind))
  ];
}

export function presentRankRow(row, position, kind) {
  return {
    id: row.id,
    position,
    name: row.name,
    section: row.section,
    resultText: Number.isFinite(row.raw) ? formatMeasure(row.raw, kind === "time" ? "time" : "distance") : "-",
    statusText: row.status === "missing" ? "Nessun risultato" : statusLabel(row.status)
  };
}

export function computeSectionStandings(day, sportWidgets) {
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

export function getRankingRowSectionId(row, sport) {
  if (sport.name === "Staffetta") {
    return db.relayTeams.find((team) => team.id === row.id)?.sectionId || "";
  }
  return db.participants.find((participant) => participant.id === row.id)?.sectionId || "";
}

import { canAdmin } from "../auth/permissions.js";
import { saveDb as persistDb } from "../data/repository.js";
import {
  deleteRemoteSportsDay,
  loadRemoteSportsDays,
  saveRemoteSportsDay
} from "../data/firestoreSportsDaysRepository.js";
import { db, state } from "../state.js";

function toast(message) {
  const previous = document.querySelector(".toast");
  if (previous) previous.remove();

  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);

  setTimeout(() => node.remove(), 2600);
}

function defer(callback) {
  window.setTimeout(callback, 0);
}

function replaceSportsDays(nextDays) {
  db.sportsDays = nextDays;
  return persistDb(db);
}

async function syncDayById(dayId) {
  const day = db.sportsDays.find((item) => item.id === dayId);
  if (!day) return;

  await saveRemoteSportsDay(day, state.user);
}

export function bindFirestoreSportsDaysSyncHandlers(app, render) {
  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form");
    if (!form || !canAdmin()) return;

    const action = form.dataset.action;

    if (action === "create-day") {
      const existingIds = new Set(db.sportsDays.map((day) => day.id));

      defer(async () => {
        const createdDay = db.sportsDays.find((day) => !existingIds.has(day.id));
        if (!createdDay) return;

        try {
          await saveRemoteSportsDay(createdDay, state.user);
          toast("Giornata sincronizzata su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore giornata non riuscita.");
        }
      });
    }

    if (action === "update-day") {
      const dayId = form.dataset.dayId;

      defer(async () => {
        try {
          await syncDayById(dayId);
          toast("Giornata aggiornata su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore giornata non riuscita.");
        }
      });
    }
  });

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canAdmin()) return;

    if (target.dataset.action === "delete-day") {
      const dayId = target.dataset.dayId;

      defer(async () => {
        const stillExists = db.sportsDays.some((day) => day.id === dayId);
        if (stillExists) return;

        try {
          await deleteRemoteSportsDay(dayId);
          toast("Giornata eliminata da Firestore.");
        } catch (error) {
          console.error(error);
          toast("Eliminazione Firestore giornata non riuscita.");
        }
      });
    }

    if (target.dataset.action === "push-sports-days-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          await Promise.all(db.sportsDays.map((day) => saveRemoteSportsDay(day, state.user)));
          toast("Giornate inviate a Firestore.");
        } catch (error) {
          console.error(error);
          toast("Invio giornate a Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "pull-sports-days-firestore") {
      if (!confirm("Caricare le giornate da Firestore? Le giornate locali verranno sostituite, gli altri dati resteranno invariati.")) return;

      defer(async () => {
        try {
          target.disabled = true;
          const remoteDays = await loadRemoteSportsDays();
          await replaceSportsDays(remoteDays);
          state.view = "dashboard";
          state.dashboardSection = "days";
          state.selectedDayId = null;
          state.selectedSportId = null;
          toast("Giornate caricate da Firestore.");
          render();
        } catch (error) {
          console.error(error);
          toast("Caricamento giornate da Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }
  });
}

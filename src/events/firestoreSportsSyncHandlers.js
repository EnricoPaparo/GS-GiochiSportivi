import { canAdmin } from "../auth/permissions.js";
import { saveDb as persistDb } from "../data/repository.js";
import {
  deleteRemoteSport,
  loadRemoteSports,
  saveRemoteSport
} from "../data/firestoreSportsRepository.js";
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

function replaceSports(nextSports) {
  db.sports = nextSports;
  persistDb(db);
}

export function bindFirestoreSportsSyncHandlers(app, render) {
  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form");
    if (!form || !canAdmin()) return;

    if (form.dataset.action === "create-day") {
      const existingIds = new Set(db.sports.map((sport) => sport.id));

      defer(async () => {
        const createdSports = db.sports.filter((sport) => !existingIds.has(sport.id));

        if (!createdSports.length) return;

        try {
          await Promise.all(createdSports.map((sport) => saveRemoteSport(sport, state.user)));
          toast("Sport sincronizzati su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore sport non riuscita.");
        }
      });
    }
  });

  app.addEventListener("change", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canAdmin()) return;

    if (target.dataset.action === "toggle-sport") {
      const dayId = target.dataset.dayId;
      const sportName = target.dataset.sportName;

      defer(async () => {
        const matchingSports = db.sports.filter((sport) => sport.dayId === dayId && sport.name === sportName);

        try {
          if (target.checked && matchingSports.length) {
            await Promise.all(matchingSports.map((sport) => saveRemoteSport(sport, state.user)));
          }

          if (!target.checked) {
            const deletedSports = db.sports.filter((sport) => sport.dayId === dayId && sport.name === sportName);

            if (!deletedSports.length) {
              const snapshotSports = await loadRemoteSports();
              const remoteMatches = snapshotSports.filter((sport) => sport.dayId === dayId && sport.name === sportName);

              await Promise.all(remoteMatches.map((sport) => deleteRemoteSport(sport.id)));
            }
          }

          toast("Sport sincronizzati su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore sport non riuscita.");
        }
      });
    }
  });

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canAdmin()) return;

    if (target.dataset.action === "push-sports-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          await Promise.all(db.sports.map((sport) => saveRemoteSport(sport, state.user)));
          toast("Sport inviati a Firestore.");
        } catch (error) {
          console.error(error);
          toast("Invio sport a Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "pull-sports-firestore") {
      if (!confirm("Caricare gli sport da Firestore? Gli sport locali verranno sostituiti.")) return;

      defer(async () => {
        try {
          target.disabled = true;
          const remoteSports = await loadRemoteSports();
          replaceSports(remoteSports);
          state.view = "dashboard";
          state.dashboardSection = "days";
          toast("Sport caricati da Firestore.");
          render();
        } catch (error) {
          console.error(error);
          toast("Caricamento sport da Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }
  });
}

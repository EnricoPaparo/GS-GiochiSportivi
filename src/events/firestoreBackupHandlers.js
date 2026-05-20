import { canAdmin } from "../auth/permissions.js";
import { saveDb as persistDb } from "../data/repository.js";
import { loadRemoteDb, saveRemoteDb } from "../data/firestoreRepository.js";
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

function replaceLocalDb(nextDb) {
  Object.keys(db).forEach((key) => {
    delete db[key];
  });

  Object.assign(db, nextDb);
  persistDb(db);
}

export function bindFirestoreBackupHandlers(app, render) {
  app.addEventListener("click", async (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canAdmin()) return;

    if (target.dataset.action === "backup-firestore") {
      try {
        target.disabled = true;
        await saveRemoteDb(db, state.user);
        toast("Backup Firestore completato.");
      } catch (error) {
        console.error(error);
        toast("Backup Firestore non riuscito.");
      } finally {
        target.disabled = false;
      }
    }

    if (target.dataset.action === "restore-firestore") {
      if (!confirm("Ripristinare i dati da Firestore? I dati locali correnti verranno sostituiti.")) return;

      try {
        target.disabled = true;
        const remoteDb = await loadRemoteDb();

        if (!remoteDb) {
          toast("Nessun backup Firestore trovato.");
          return;
        }

        replaceLocalDb(remoteDb);
        state.view = "dashboard";
        state.dashboardSection = "days";
        state.selectedDayId = null;
        state.selectedSportId = null;
        state.modalTeamId = null;
        state.teamInfoId = null;
        state.profileOpen = false;

        toast("Ripristino Firestore completato.");
        render();
      } catch (error) {
        console.error(error);
        toast("Ripristino Firestore non riuscito.");
      } finally {
        target.disabled = false;
      }
    }
  });
}

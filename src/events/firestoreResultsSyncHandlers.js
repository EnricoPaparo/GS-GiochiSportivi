import { canEditResults } from "../auth/permissions.js";
import { loadRemoteAttempts, saveRemoteAttempt } from "../data/firestoreAttemptsRepository.js";
import { loadRemoteResults, saveRemoteResult } from "../data/firestoreResultsRepository.js";
import { saveDb as persistDb } from "../data/repository.js";
import { db, state } from "../state.js";

function toast(message) {
  const previous = document.querySelector(".toast");
  if (previous) previous.remove();

  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);

  setTimeout(() => node.remove(), 1800);
}

function defer(callback) {
  window.setTimeout(callback, 0);
}

function replaceAttempts(nextAttempts) {
  db.attempts = nextAttempts;
  return persistDb(db);
}

function replaceResults(nextResults) {
  db.results = nextResults;
  return persistDb(db);
}

function findAttemptFromTarget(target) {
  return db.attempts.find((attempt) =>
    attempt.sportId === target.dataset.sportId &&
    attempt.participantId === target.dataset.participantId &&
    attempt.phase === target.dataset.phase &&
    attempt.attemptIndex === Number(target.dataset.attemptIndex)
  );
}

function findTeamResultFromTarget(target) {
  return db.results.find((result) =>
    result.targetType === "team" &&
    result.targetId === target.dataset.teamId
  );
}

function findFinalResultFromTarget(target) {
  return db.results.find((result) =>
    result.sportId === target.dataset.sportId &&
    result.phase === "final" &&
    result.targetType === "participant" &&
    result.targetId === target.dataset.participantId
  );
}

async function syncAttemptFromTarget(target) {
  const attempt = findAttemptFromTarget(target);
  if (attempt) await saveRemoteAttempt(attempt, state.user);
}

async function syncResultFromTarget(target) {
  const result = target.dataset.teamId
    ? findTeamResultFromTarget(target)
    : findFinalResultFromTarget(target);

  if (result) await saveRemoteResult(result, state.user);
}

export function bindFirestoreResultsSyncHandlers(app, render) {
  app.addEventListener("change", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canEditResults()) return;

    if (["update-attempt-status"].includes(target.dataset.action)) {
      defer(async () => {
        try {
          await syncAttemptFromTarget(target);
        } catch (error) {
          console.error(error);
          toast("Sync prova non riuscita.");
        }
      });
    }

    if (["update-team-status", "update-final-status"].includes(target.dataset.action)) {
      defer(async () => {
        try {
          await syncResultFromTarget(target);
        } catch (error) {
          console.error(error);
          toast("Sync risultato non riuscita.");
        }
      });
    }
  });

  app.addEventListener("input", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canEditResults()) return;

    if (["update-attempt-value"].includes(target.dataset.action)) {
      defer(async () => {
        try {
          await syncAttemptFromTarget(target);
        } catch (error) {
          console.error(error);
          toast("Sync prova non riuscita.");
        }
      });
    }

    if (["update-team-value", "update-final-value"].includes(target.dataset.action)) {
      defer(async () => {
        try {
          await syncResultFromTarget(target);
        } catch (error) {
          console.error(error);
          toast("Sync risultato non riuscita.");
        }
      });
    }
  });

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canEditResults()) return;

    if (target.dataset.action === "refresh-firestore-results") {
      defer(async () => {
        try {
          const [remoteAttempts, remoteResults] = await Promise.all([
            loadRemoteAttempts(),
            loadRemoteResults()
          ]);
          await replaceAttempts(remoteAttempts);
          await replaceResults(remoteResults);
          toast("Risultati aggiornati da Firestore.");
          render();
        } catch (error) {
          console.error(error);
          toast("Aggiornamento risultati non riuscito.");
        }
      });
    }
  });
}

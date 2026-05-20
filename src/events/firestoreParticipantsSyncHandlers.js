import { canAdmin } from "../auth/permissions.js";
import { saveDb as persistDb } from "../data/repository.js";
import {
  deleteRemoteParticipant,
  loadRemoteParticipants,
  saveRemoteParticipant
} from "../data/firestoreParticipantsRepository.js";
import {
  deleteRemoteRelayTeam,
  loadRemoteRelayTeams,
  saveRemoteRelayTeam
} from "../data/firestoreRelayTeamsRepository.js";
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

function replaceParticipants(nextParticipants) {
  db.participants = nextParticipants;
  persistDb(db);
}

function replaceRelayTeams(nextTeams) {
  db.relayTeams = nextTeams;
  persistDb(db);
}

export function bindFirestoreParticipantsSyncHandlers(app, render) {
  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form");
    if (!form || !canAdmin()) return;

    if (form.dataset.action === "add-participant") {
      const existingIds = new Set(db.participants.map((participant) => participant.id));

      defer(async () => {
        const createdParticipant = db.participants.find((participant) => !existingIds.has(participant.id));

        if (!createdParticipant) return;

        try {
          await saveRemoteParticipant(createdParticipant, state.user);
          toast("Partecipante sincronizzato su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore partecipante non riuscita.");
        }
      });
    }

    if (form.dataset.action === "add-team") {
      const existingIds = new Set(db.relayTeams.map((team) => team.id));

      defer(async () => {
        const createdTeam = db.relayTeams.find((team) => !existingIds.has(team.id));

        if (!createdTeam) return;

        try {
          await saveRemoteRelayTeam(createdTeam, state.user);
          toast("Squadra sincronizzata su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore squadra non riuscita.");
        }
      });
    }
  });

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canAdmin()) return;

    if (target.dataset.action === "delete-participant") {
      const participantId = target.dataset.participantId;

      defer(async () => {
        const stillExists = db.participants.some((participant) => participant.id === participantId);
        if (stillExists) return;

        try {
          await deleteRemoteParticipant(participantId);
          toast("Partecipante eliminato da Firestore.");
        } catch (error) {
          console.error(error);
          toast("Eliminazione Firestore partecipante non riuscita.");
        }
      });
    }

    if (target.dataset.action === "delete-team") {
      const teamId = target.dataset.teamId;

      defer(async () => {
        const stillExists = db.relayTeams.some((team) => team.id === teamId);
        if (stillExists) return;

        try {
          await deleteRemoteRelayTeam(teamId);
          toast("Squadra eliminata da Firestore.");
        } catch (error) {
          console.error(error);
          toast("Eliminazione Firestore squadra non riuscita.");
        }
      });
    }

    if (target.dataset.action === "push-participants-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          await Promise.all(db.participants.map((participant) => saveRemoteParticipant(participant, state.user)));
          toast("Partecipanti inviati a Firestore.");
        } catch (error) {
          console.error(error);
          toast("Invio partecipanti a Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "pull-participants-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          const remoteParticipants = await loadRemoteParticipants();
          replaceParticipants(remoteParticipants);
          toast("Partecipanti caricati da Firestore.");
          render();
        } catch (error) {
          console.error(error);
          toast("Caricamento partecipanti da Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "push-relay-teams-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          await Promise.all(db.relayTeams.map((team) => saveRemoteRelayTeam(team, state.user)));
          toast("Squadre inviate a Firestore.");
        } catch (error) {
          console.error(error);
          toast("Invio squadre a Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "pull-relay-teams-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          const remoteTeams = await loadRemoteRelayTeams();
          replaceRelayTeams(remoteTeams);
          toast("Squadre caricate da Firestore.");
          render();
        } catch (error) {
          console.error(error);
          toast("Caricamento squadre da Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }
  });
}

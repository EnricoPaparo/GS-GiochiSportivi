import { canAdmin } from "../auth/permissions.js";
import { saveDb as persistDb } from "../data/repository.js";
import {
  deleteRemoteSection,
  loadRemoteSections,
  saveRemoteSection
} from "../data/firestoreSectionsRepository.js";
import {
  deleteRemoteYear,
  loadRemoteYears,
  saveRemoteYear
} from "../data/firestoreYearsRepository.js";
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

function replaceYears(nextYears) {
  db.years = nextYears;
  return persistDb(db);
}

function replaceSections(nextSections) {
  db.sections = nextSections;
  return persistDb(db);
}

export function bindFirestoreSchoolStructureSyncHandlers(app, render) {
  app.addEventListener("submit", (event) => {
    const form = event.target.closest("form");
    if (!form || !canAdmin()) return;

    if (form.dataset.action === "add-year") {
      const existingIds = new Set(db.years.map((year) => year.id));

      defer(async () => {
        const createdYear = db.years.find((year) => !existingIds.has(year.id));

        if (!createdYear) return;

        try {
          await saveRemoteYear(createdYear, state.user);
          toast("Anno sincronizzato su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore anno non riuscita.");
        }
      });
    }

    if (form.dataset.action === "add-section") {
      const existingIds = new Set(db.sections.map((section) => section.id));

      defer(async () => {
        const createdSection = db.sections.find((section) => !existingIds.has(section.id));

        if (!createdSection) return;

        try {
          await saveRemoteSection(createdSection, state.user);
          toast("Sezione sincronizzata su Firestore.");
        } catch (error) {
          console.error(error);
          toast("Sync Firestore sezione non riuscita.");
        }
      });
    }
  });

  app.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target || !canAdmin()) return;

    if (target.dataset.action === "delete-year") {
      const yearId = target.dataset.yearId;

      defer(async () => {
        const stillExists = db.years.some((year) => year.id === yearId);
        if (stillExists) return;

        try {
          await deleteRemoteYear(yearId);
          toast("Anno eliminato da Firestore.");
        } catch (error) {
          console.error(error);
          toast("Eliminazione Firestore anno non riuscita.");
        }
      });
    }

    if (target.dataset.action === "delete-section") {
      const sectionId = target.dataset.sectionId;

      defer(async () => {
        const stillExists = db.sections.some((section) => section.id === sectionId);
        if (stillExists) return;

        try {
          await deleteRemoteSection(sectionId);
          toast("Sezione eliminata da Firestore.");
        } catch (error) {
          console.error(error);
          toast("Eliminazione Firestore sezione non riuscita.");
        }
      });
    }

    if (target.dataset.action === "push-years-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          await Promise.all(db.years.map((year) => saveRemoteYear(year, state.user)));
          toast("Anni inviati a Firestore.");
        } catch (error) {
          console.error(error);
          toast("Invio anni a Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "pull-years-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          const remoteYears = await loadRemoteYears();
          await replaceYears(remoteYears);
          toast("Anni caricati da Firestore.");
          render();
        } catch (error) {
          console.error(error);
          toast("Caricamento anni da Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "push-sections-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          await Promise.all(db.sections.map((section) => saveRemoteSection(section, state.user)));
          toast("Sezioni inviate a Firestore.");
        } catch (error) {
          console.error(error);
          toast("Invio sezioni a Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }

    if (target.dataset.action === "pull-sections-firestore") {
      defer(async () => {
        try {
          target.disabled = true;
          const remoteSections = await loadRemoteSections();
          await replaceSections(remoteSections);
          toast("Sezioni caricate da Firestore.");
          render();
        } catch (error) {
          console.error(error);
          toast("Caricamento sezioni da Firestore non riuscito.");
        } finally {
          target.disabled = false;
        }
      });
    }
  });
}

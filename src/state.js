import { getDb } from "./data/repository.js";

export const state = {
  view: "auth",
  user: null,
  selectedDayId: null,
  selectedSportId: null,
  dashboardSection: "days",
  sportTab: "proves",
  speedPhase: "qualifications",
  modalTeamId: null,
  teamInfoId: null,
  profileOpen: false,
  adminInfoOpen: false,
  firebaseReadsThisSession: 0,
  randomOrder: false,
  filters: {
    yearId: "",
    sectionId: "",
    sex: "M"
  }
};

export const db = getDb();

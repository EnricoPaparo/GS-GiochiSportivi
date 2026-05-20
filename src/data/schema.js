import { ROLES } from "../constants.js";

export const SESSION_KEY = "giornateSportive.session.v1";

export const LOCKED_ADMIN_ID = "locked_admin_root";
export const LOCKED_ADMIN_USER = {
  id: LOCKED_ADMIN_ID,
  firstName: "admin",
  lastName: "admin",
  username: "admin",
  password: "LGoptimus7!",
  role: ROLES.ADMIN,
  locked: true
};

export function emptyDb() {
  return {
    meta: {
      participantsScopedBySport: true
    },
    users: [],
    sportsDays: [],
    sports: [],
    years: [],
    sections: [],
    participants: [],
    relayTeams: [],
    results: [],
    attempts: [],
    rankings: []
  };
}

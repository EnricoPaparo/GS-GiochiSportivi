import { ROLES } from "../constants.js";
import { LOCKED_ADMIN_ID } from "../data/schema.js";
import { db, state } from "../state.js";

export function canAdmin() {
  return state.user?.role === ROLES.ADMIN;
}

export function canEditResults() {
  return state.user?.role === ROLES.ADMIN || state.user?.role === ROLES.TEACHER;
}

export function isGuest() {
  return state.user?.role === ROLES.GUEST;
}

export function isLockedUser(userOrId) {
  const user = typeof userOrId === "string" ? db.users.find((item) => item.id === userOrId) : userOrId;
  return user?.id === LOCKED_ADMIN_ID || user?.locked === true;
}

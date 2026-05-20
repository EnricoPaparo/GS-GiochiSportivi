import { ROLES } from "../constants.js";
import { state } from "../state.js";

export function canAdmin() {
  return state.user?.role === ROLES.ADMIN;
}

export function canEditResults() {
  return state.user?.role === ROLES.ADMIN || state.user?.role === ROLES.TEACHER;
}

export function isGuest() {
  return state.user?.role === ROLES.GUEST;
}

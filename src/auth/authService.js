import { ROLES } from "../constants.js";
import { clearSession, getSession, saveSession } from "../data/repository.js";
import { db, state } from "../state.js";

export function setSession(user) {
  state.user = user ? { id: user.id, username: user.username, role: user.role } : null;
  if (state.user) saveSession(state.user);
  else clearSession();
}

export function restoreSession() {
  const session = getSession();
  if (!session) return;
  if (session.role === ROLES.GUEST || db.users.some((user) => user.id === session.id)) {
    state.user = session;
    state.view = "dashboard";
  }
}

export function updateSession(patch) {
  if (!state.user) return;
  state.user = { ...state.user, ...patch };
  saveSession(state.user);
}

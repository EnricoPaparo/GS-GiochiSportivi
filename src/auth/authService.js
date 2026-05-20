import { ROLES } from "../constants.js";
import { clearSession, getSession, saveSession } from "../data/repository.js";
import { db, state } from "../state.js";

export function setSession(user) {
  state.user = user
    ? {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email || "",
        provider: user.provider || "local"
      }
    : null;

  if (state.user) saveSession(state.user);
  else clearSession();
}

export function restoreSession() {
  const session = getSession();
  if (!session) return;

  // Guest users are always valid locally.
  if (session.role === ROLES.GUEST) {
    state.user = session;
    state.view = "dashboard";
    return;
  }

  // Local users created inside the app.
  if (session.provider !== "firebase" && db.users.some((user) => user.id === session.id)) {
    state.user = session;
    state.view = "dashboard";
    return;
  }

  // Firebase users will be restored later by Firebase Auth listener.
}

export function updateSession(patch) {
  if (!state.user) return;
  state.user = { ...state.user, ...patch };
  saveSession(state.user);
}

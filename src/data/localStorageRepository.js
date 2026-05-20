import { DB_KEY, emptyDb, SESSION_KEY } from "./schema.js";
import { ensureLockedAdminUser, migrateDb } from "./migrations.js";

export function getDb() {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const migrated = migrateDb(parsed);
      localStorage.setItem(DB_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {
      localStorage.removeItem(DB_KEY);
    }
  }
  const fresh = emptyDb();
  ensureLockedAdminUser(fresh);
  localStorage.setItem(DB_KEY, JSON.stringify(fresh));
  return fresh;
}

export function saveDb(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function resetDb() {
  const fresh = emptyDb();
  ensureLockedAdminUser(fresh);
  saveDb(fresh);
  return fresh;
}

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

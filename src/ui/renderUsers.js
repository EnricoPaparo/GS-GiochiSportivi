import { ROLES } from "../constants.js";
import { db, state } from "../state.js";
import { isLockedUser } from "../auth/permissions.js";
import { escapeHtml } from "../utils/html.js";

export function renderUsersSection() {
  const users = [...db.users].sort((a, b) => a.username.localeCompare(b.username));
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Firestore</p>
          <h2>Backup e ripristino cloud</h2>
        </div>
        <span class="role-pill">fase ponte</span>
      </div>
      <p class="muted" style="margin-top: 0;">
        I dati live restano su questo dispositivo tramite localStorage. Usa questi comandi per salvare o ripristinare una copia completa su Firestore.
      </p>
      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn" type="button" data-action="backup-firestore">Backup su Firestore</button>
        <button class="btn secondary" type="button" data-action="restore-firestore">Ripristina da Firestore</button>
      </div>
      <div class="inline">
        <button class="btn secondary" type="button" data-action="push-sports-days-firestore">Invia giornate a Firestore</button>
        <button class="btn secondary" type="button" data-action="pull-sports-days-firestore">Carica giornate da Firestore</button>
      </div>
    </section>

    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Utenze</p>
          <h2>Gestione utenti</h2>
        </div>
        <span class="role-pill">${users.length} utenti</span>
      </div>
      <form data-action="register" style="margin-bottom: 18px;">
        <h3 style="margin-top: 0;">Nuovo utente</h3>
        <div class="form-grid three">
          <div class="field">
            <label for="reg-firstName">Nome</label>
            <input id="reg-firstName" name="firstName" required>
          </div>
          <div class="field">
            <label for="reg-lastName">Cognome</label>
            <input id="reg-lastName" name="lastName" required>
          </div>
          <div class="field">
            <label for="reg-username">Username</label>
            <input id="reg-username" name="username" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="reg-password">Password</label>
            <input id="reg-password" name="password" type="password" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="reg-role">Tipo utente</label>
            <select id="reg-role" name="role">
              <option>${ROLES.TEACHER}</option>
              <option>${ROLES.ADMIN}</option>
              <option>${ROLES.GUEST}</option>
            </select>
          </div>
        </div>
        <div class="inline" style="margin-top: 14px;">
          <button class="btn" type="submit">Crea utente</button>
        </div>
      </form>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cognome</th>
              <th>Nome</th>
              <th>Username</th>
              <th>Password</th>
              <th>Ruolo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(renderUserRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderUserRow(user) {
  const isCurrent = state.user?.id === user.id;
  const locked = isLockedUser(user);
  const disabled = locked ? "disabled" : "";
  return `
    <tr class="${locked ? "locked-user-row" : ""}">
      <td><input value="${escapeHtml(user.lastName)}" data-action="update-user" data-field="lastName" data-user-id="${user.id}" ${disabled}></td>
      <td><input value="${escapeHtml(user.firstName)}" data-action="update-user" data-field="firstName" data-user-id="${user.id}" ${disabled}></td>
      <td><input value="${escapeHtml(user.username)}" data-action="update-user" data-field="username" data-user-id="${user.id}" ${disabled}></td>
      <td><input value="${escapeHtml(user.password)}" data-action="update-user" data-field="password" data-user-id="${user.id}" ${disabled}></td>
      <td>
        <select data-action="update-user" data-field="role" data-user-id="${user.id}" ${isCurrent || locked ? "disabled" : ""}>
          <option ${user.role === ROLES.ADMIN ? "selected" : ""}>${ROLES.ADMIN}</option>
          <option ${user.role === ROLES.TEACHER ? "selected" : ""}>${ROLES.TEACHER}</option>
          <option ${user.role === ROLES.GUEST ? "selected" : ""}>${ROLES.GUEST}</option>
        </select>
      </td>
      <td>
        <button class="btn danger tiny" data-action="delete-user" data-user-id="${user.id}" ${isCurrent || locked ? "disabled" : ""}>Elimina</button>
        ${locked ? `<span class="status-pill">Bloccato</span>` : ""}
      </td>
    </tr>
  `;
}

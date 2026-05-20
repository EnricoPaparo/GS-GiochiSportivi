export function renderAuth() {
  return `
    <main class="auth-page">
      <section class="auth-panel">
        <p class="eyebrow">Scuola in movimento</p>
        <h1>Giornate sportive scolastiche</h1>
        <p>Gestisci prove, partecipanti, risultati e classifiche con accessi separati per amministratori, docenti e spettatori.</p>
        <div class="auth-actions">
          <button class="btn secondary" data-action="guest-login">Accedi come spettatore</button>
        </div>
      </section>
      <section class="auth-forms">
        <form class="panel" data-action="firebase-login">
          <div class="section-head">
            <h2>Login docenti/admin</h2>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="firebase-email">Email</label>
              <input id="firebase-email" name="email" type="email" autocomplete="email" required>
            </div>
            <div class="field">
              <label for="firebase-password">Password</label>
              <input id="firebase-password" name="password" type="password" autocomplete="current-password" required>
            </div>
          </div>
          <div class="inline" style="margin-top: 14px;">
            <button class="btn" type="submit">Accedi con Firebase</button>
          </div>
        </form>
        <form class="panel" data-action="login">
          <div class="section-head">
            <h2>Login locale temporaneo</h2>
          </div>
          <div class="form-grid">
            <div class="field">
              <label for="login-username">Username</label>
              <input id="login-username" name="username" autocomplete="username" required>
            </div>
            <div class="field">
              <label for="login-password">Password</label>
              <input id="login-password" name="password" type="password" autocomplete="current-password" required>
            </div>
          </div>
          <div class="inline" style="margin-top: 14px;">
            <button class="btn secondary" type="submit">Accedi locale</button>
          </div>
        </form>
      </section>
    </main>
  `;
}

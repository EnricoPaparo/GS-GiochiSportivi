export function renderUsersSection() {
  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Firestore</p>
          <h2>Strumenti amministrazione cloud</h2>
        </div>
        <span class="role-pill">cloud-ready</span>
      </div>
      <p class="muted" style="margin-top: 0;">
        La piattaforma utilizza Firebase Auth per l'accesso e Firestore come database cloud principale. Questi strumenti gestiscono il backup e il ripristino dello snapshot applicativo unico.
      </p>

      <div class="inline" style="margin-bottom: 12px;">
        <button class="btn" type="button" data-action="backup-firestore">Backup su Firestore</button>
        <button class="btn secondary" type="button" data-action="restore-firestore">Ripristina da Firestore</button>
      </div>
    </section>
  `;
}
